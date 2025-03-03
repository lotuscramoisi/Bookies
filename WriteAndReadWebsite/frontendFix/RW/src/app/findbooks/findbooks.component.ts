import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component } from '@angular/core';
import { Router } from '@angular/router';

interface Book {
  id: number;
  title: string;
  hash: string;
}

@Component({
  selector: 'app-findbooks',
  imports: [CommonModule],
  templateUrl: './findbooks.component.html',
  styleUrl: './findbooks.component.css'
})
export class FindbooksComponent implements AfterViewInit{
  books: Book[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  ngAfterViewInit(): void {
    this.fetchBooks();
  }

  ngOnInit(): void {
    this.fetchBooks();
  }



  fetchBooks(): void {
    this.http.get<Book[]>('http://localhost:3000/books').subscribe(
      (data) => {
        this.books = data;
      },
      (error) => {
        console.error('Error fetching books:', error);
      }
    );
  }

  startTyping(book: Book): void {
    this.router.navigate(['/type-book', book.id]);
  }

  newBook(){
    this.router.navigate(['/create-book']);
  }

  confirmDelete(bookId: number): void {
    const confirmed = window.confirm('Are you sure you want to delete this book?');
    if (confirmed) {
      this.deleteBook(bookId);
    }
  }  

  deleteBook(bookId: number): void {
    this.http.delete(`http://localhost:3000/books/${bookId}`).subscribe(
      () => {
        this.books = this.books.filter((book) => book.id !== bookId);
      },
      (error) => {
        console.error('Error deleting book:', error);
      }
    );
  }
}
