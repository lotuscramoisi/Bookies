const fs = require('fs');

// Read the text file
const bookText = fs.readFileSync('./Books/TheDragonRepublic.txt', 'utf8');

function parseChapters(bookText) {
  const chapterRegex = /Chapter (\d+): (.+?)(?=\nChapter \d+:|$)/gs;
  let chapters = [];
  let match;

  while ((match = chapterRegex.exec(bookText)) !== null) {
    const chapter = {
      number: match[1],
      title: match[2].trim(),
      content: match[0].replace(match[1], "").replace(match[2], "").trim(),
    };
    chapters.push(chapter);
  }
  return chapters;
}

// Split the book text into chapters
const chapters = parseChapters(bookText);
console.log(chapters);  // Preview chapters