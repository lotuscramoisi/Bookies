import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import ePub from 'epubjs';
import Section from 'epubjs/types/section';


@Component({
  selector: 'app-typing',
  imports: [CommonModule, FormsModule],
  templateUrl: './typing.component.html',
  styleUrl: './typing.component.css'
})
export class TypingComponent implements OnInit{
  bookId!: number;
  chapters: string[] = [];
  bookTitle: string = "";

  currentChapter = 0;
  currentCharIndex: number = 0;
  textArray: string[] = [];
  startTime: number | null = null;


  totalTypedLetters: number = 0;
  mistypedLetters: number = 0;
  bookhash: string = ""; 

  wpmHelper: number = 0;
  wpm: number = 0;
  accuracy: number = 100;

  currentWordIndex: number = 0;
  wordsPerPage: number = 1000;

  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.bookId = Number(this.route.snapshot.paramMap.get('id'));   
    
    if (this.bookId) {
      this.fetchBook();
    }
  }

  fetchBook(): void {
    this.http.get(`http://localhost:3000/book/${this.bookId}`).subscribe(
      async (data: any) => {
        this.bookTitle = data.title;
        this.bookhash = data.hash;
        this.accuracy = data.accuracy;
        this.currentChapter = data.currentChapter;
        this.mistypedLetters = data.mistypedLetters;
        this.totalTypedLetters = data.totalTypedLetters;
        this.currentWordIndex = data.currentWordIndex;

        this.http.get(`http://localhost:3000/download/${this.bookId}?t=${new Date().getTime()}`, {
          responseType: 'blob',
        }).subscribe(
          async (blob) => {     
            await this.loadEpub(blob);
          },
          (error) => {
            console.error("Error fetching book file:", error);
          }
        );
      },
      (error) => {
        console.error("Error fetching book data:", error);
      }
    );
  }
  

  async loadEpub(file: Blob): Promise<void> {
    // Convert the Blob to an ArrayBuffer directly
    const arrayBuffer = await file.arrayBuffer();
  
    // Now pass the ArrayBuffer directly to ePub.js
    const book = ePub(arrayBuffer);
  
    // Wait for the book to be ready
    await book.ready;
  
    // Now you can proceed with getting chapters or any other processing
    this.chapters = await this.getChaptersFromEpub(arrayBuffer);
    this.updateTextArray();
  }
  


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
          .replace(/\s+/g, " ") // Clean up multiple spaces
          .replace(/[’‘′ʼ`]/g, "'") // Replace alternative apostrophes with standard apostrophe
          .replace(/[“”]/g, "'"); // Replace double quotes with single
      })();

      sectionPromises.push(sectionPromise);
    });

    const content = await Promise.all(sectionPromises);
    return content.filter(text => text);
  }
  
  // Handles moving to the next page (set of words)
  nextPage() {
    this.currentWordIndex += this.wordsPerPage;
    const sizeOfChapter = this.chapters[this.currentChapter].length 

    if(this.currentWordIndex >= sizeOfChapter){
      this.nextChapter();
    }else{
      this.updateTextArray();
    }
    console.log(this.currentWordIndex)
    this.sendStatsToBackend();
    this.resetWPM();
  }

  // Moves to the next chapter
  nextChapter() {
    if(this.currentChapter >= this.chapters.length){
      this.textArray = ["Y","O","U"," ","F","I","N","I","S","H","E","D"]
    }
    else{
      this.currentChapter += 1;
      this.currentWordIndex = 0;
      this.updateTextArray();  // Update the text for the new chapter
    }
    this.resetWPM();
  }

  previousChapter() {
    if (this.currentChapter > 0) {
      this.currentChapter -= 1;
      this.currentWordIndex = 0;
      this.updateTextArray();
    }
    this.resetWPM();
  }
  

  // Updates the displayed text for the current page (set of words)
  updateTextArray() {
    const endWordIndex = this.currentWordIndex + this.wordsPerPage;
    this.textArray = this.chapters[this.currentChapter].slice(this.currentWordIndex, endWordIndex).split("");
    this.currentCharIndex = 0;
  }

  onKeyPress(event: KeyboardEvent){
    this.calculateAccuracy();
    this.calculateWPM();

    if (this.textArray[this.currentCharIndex] === event.key) {
      this.currentCharIndex += 1;  
    } else {
      this.mistypedLetters += 1; 
    }

    this.totalTypedLetters += 1;

    if (this.currentCharIndex === this.textArray.length) {
      this.nextPage();
    }
  }

  skipCharacter(){
    this.currentCharIndex += 1;
    this.totalTypedLetters += 1;

    if (this.currentCharIndex === this.textArray.length) {
      this.nextPage();
    }
  }

  resetWPM(){
    this.startTime = 0;
    this.wpmHelper = 0;
  }

  calculateWPM() {
    if (!this.startTime) {
      this.startTime = Date.now();
      return;
    }
    this.wpmHelper += 1;
  
    const elapsedTimeInMinutes = (Date.now() - this.startTime) / 60000;
    console.log(elapsedTimeInMinutes)
    if (elapsedTimeInMinutes > 0) {
      this.wpm = (this.wpmHelper / 5) / elapsedTimeInMinutes;
    }
  }
  

  calculateAccuracy(): void {
    if (this.totalTypedLetters > 0) {
      this.accuracy = ((this.totalTypedLetters - this.mistypedLetters) / this.totalTypedLetters) * 100;
    }
  }

  async hashBook(text: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  sendStatsToBackend(): void {
    const book = {
      totalTypedLetters: this.totalTypedLetters,
      currentChapter: this.currentChapter,
      currentWordIndex: this.currentWordIndex,
      mistypedLetters: this.mistypedLetters,
      accuracy: this.accuracy.toFixed(2),
      wpm: this.wpm,
      hash: this.bookhash      
    };
    
    this.http.put(`http://localhost:3000/book/${this.bookId}`, book).subscribe(
      response => console.log('Stats updated successfully:', response),
      error => console.error('Error updating stats:', error)
    );
  }
  

  isTyped(index: number): boolean {
    return index < this.currentCharIndex;
  }

  isCurrent(index: number): boolean {
    return index === this.currentCharIndex;
  }

  goToHome(){
    this.router.navigate(['/find-books']);
  }
}