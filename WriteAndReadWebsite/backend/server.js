const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = new sqlite3.Database("./books.db");
const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));

// Multer Configuration: Store files in "uploads/" folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "./uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true }); // Ensure directory exists
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Keep original extension
  },
});

const upload = multer({ storage });

// Create the BookDetails table (if it doesn't exist)
db.run(`
  CREATE TABLE IF NOT EXISTS BookDetails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    hash TEXT UNIQUE,
    currentChapter INTEGER,
    currentWordIndex INTEGER,
    bookPath TEXT, 
    totalTypedLetters INTEGER,
    mistypedLetters INTEGER,
    accuracy REAL,
    wpm REAL
  )
`);

// **1️⃣ Endpoint to Add a New Book (with File Upload)**
app.post("/book", upload.single("book"), (req, res) => {
  const { totalTypedLetters, currentChapter, currentWordIndex, mistypedLetters, accuracy, wpm, hash, bookTitle } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: "Book file is required" });
  }

  const bookPath = req.file.path; // Path where file is stored

  db.run(
    `INSERT INTO BookDetails (title, hash, currentChapter, currentWordIndex ,bookPath, totalTypedLetters, mistypedLetters, accuracy, wpm) 
     VALUES (?, ?, ?, ?, ?, ?,  ?, ?, ?)`,
    [bookTitle, hash, currentChapter, currentWordIndex, bookPath, totalTypedLetters, mistypedLetters, accuracy, wpm],
    function (err) {
      if (err) {
        console.error("Error inserting book:", err);
        return res.status(500).json({ error: "Failed to save book" });
      }
      res.status(201).json({ message: "Book saved successfully", bookId: this.lastID });
    }
  );
});

// **2️⃣ Endpoint to Retrieve All Books (Without Full File)**
app.get("/books", (req, res) => {
  db.all("SELECT id, title, hash FROM BookDetails", (err, rows) => {
    if (err) {
      console.error("Error retrieving books:", err);
      return res.status(500).json({ error: "Failed to fetch books" });
    }
    res.json(rows);
  });
});

// **3️⃣ Endpoint to Get Book Details (Including File Path)**
app.get("/book/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM BookDetails WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Error retrieving book:", err);
      return res.status(500).json({ error: "Failed to fetch book" });
    }
    if (!row) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.json(row);
  });
});

// **4️⃣ Serve Book Files (Download Endpoint)**
app.get("/download/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT bookPath FROM BookDetails WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Error retrieving book file:", err);
      return res.status(500).json({ error: "Failed to fetch book file" });
    }
    if (!row || !row.bookPath) {
      return res.status(404).json({ error: "File not found" });
    }
    const filePath = row.bookPath
    res.setHeader("Content-Type", "application/epub+zip"); // Set correct MIME type
    
    res.sendFile(filePath, { root: __dirname }, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).json({ error: err });
      }
    });
  });
});


// **5️⃣ Endpoint to Update Book Stats**
app.put("/book/:id", (req, res) => {
  const { id } = req.params;
  const { totalTypedLetters, currentChapter, currentWordIndex, mistypedLetters, accuracy, wpm, hash } = req.body;

  // Validate that the necessary data exists
  if (totalTypedLetters === undefined || currentChapter === undefined || mistypedLetters === undefined || accuracy === undefined || wpm === undefined || hash === undefined || currentWordIndex === undefined) {
    return res.status(400).json({ error: "Missing required data fields" });
  }

  // Update the stats in the database
  db.run(
    `UPDATE BookDetails SET 
      totalTypedLetters = ?, 
      currentChapter = ?,
      currentWordIndex = ?, 
      mistypedLetters = ?, 
      accuracy = ?, 
      wpm = ? 
      WHERE id = ? AND hash = ?`,
    [totalTypedLetters, currentChapter, currentWordIndex, mistypedLetters, accuracy, wpm, id, hash],
    function (err) {
      if (err) {
        console.error("Error updating book stats:", err);
        return res.status(500).json({ error: "Failed to update book stats" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Book not found or hash mismatch" });
      }

      res.status(200).json({ message: "Book stats updated successfully" });
    }
  );
});


app.delete("/books/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM BookDetails WHERE id = ?", [id], function (err) {
    if (err) {
      console.error("Error deleting book:", err);
      return res.status(500).json({ error: "Failed to delete book" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.status(200).json({ message: "Book deleted successfully" });
  });
});


// **Start the Server**
app.listen(3000, () => console.log("Server running on port 3000"));
