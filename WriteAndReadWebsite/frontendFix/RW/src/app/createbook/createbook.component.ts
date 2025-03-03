import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import ePub, { Book } from 'epubjs';
import Section from 'epubjs/types/section';
import { Router } from '@angular/router';

@Component({
  selector: 'app-createbook',
  imports: [FormsModule, CommonModule],
  templateUrl: './createbook.component.html',
  styleUrl: './createbook.component.css'
})
export class CreatebookComponent {
  book!: Book;
  chapters: string[] = [];

  currentChapter = 0;
  currentCharIndex: number = 0;
  textArray: string[] = [];

  fileObject!: Blob;
  bookTitle: string = "";
  totalTypedLetters: number = 0;
  mistypedLetters: number = 0;
  bookhash: string = ""; 

  wpm: number = 0;
  accuracy: number = 100;

  currentWordIndex: number = 0;
  wordsPerPage: number = 10;

  constructor(private http: HttpClient, private router: Router) {}


  async onFileSelected(event: any): Promise<void> {
    const file = event.target.files[0];
    this.fileObject = file
    if (file) {
      this.chapters = await this.getChaptersFromEpub(file);
      
      const bookText = this.chapters.join(' ');
      await this.hashBook(bookText).then(hash => this.bookhash = hash);

      this.currentChapter = 0;
      this.currentWordIndex = 0;
    }
  }

  async hashBook(text: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Extracts chapters from the ePub file
  async getChaptersFromEpub(epub: string | ArrayBuffer): Promise<string[]> {
    const book = ePub(epub);
    await book.ready;
    

    const sectionPromises: Promise<string>[] = [];

    book.spine.each((section: Section) => {
      const sectionPromise = (async () => {
        const chapter = await book.load(section.href);
        if (!(chapter instanceof Document) || !chapter.body?.textContent) {
          return "";
        }
        return chapter.body.textContent.trim()
        .replace(/\s+/g, ' ')  // Clean up multiple spaces
        .replace(/’/g, '\'');  // Replace English apostrophes with French apostrophes
      })();

      sectionPromises.push(sectionPromise);
    });

    const content = await Promise.all(sectionPromises);
    return content.filter(text => text);
  }


  sendStatsToBackend(): void {
    const formData = new FormData();
    formData.append('totalTypedLetters', this.totalTypedLetters.toString());
    formData.append('currentChapter', this.currentChapter.toString());
    formData.append('currentWordIndex', '0');
    formData.append('mistypedLetters', this.mistypedLetters.toString());
    formData.append('accuracy', this.accuracy.toFixed(2));
    formData.append('wpm', this.wpm.toString());
    formData.append('hash', this.bookhash);
    formData.append('bookTitle', this.bookTitle);

  
    // Append the actual file
    formData.append('book', this.fileObject as Blob, this.bookTitle || 'uploadedBook.epub');
  
    this.http.post('http://localhost:3000/book', formData).subscribe(
      response => console.log('Stats sent successfully:', response),
      error => console.error('Error sending stats:', error)
    );

    this.router.navigate(['/find-books']);
  }
  

  goToHome(){
    this.router.navigate(['/find-books']);
  }

}
