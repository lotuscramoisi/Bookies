import { Routes } from '@angular/router';
import { CreatebookComponent } from './createbook/createbook.component';
import { TypingComponent } from './typing/typing.component';
import { FindbooksComponent } from './findbooks/findbooks.component';

export const routes: Routes = [
    { path: 'create-book', component: CreatebookComponent },
    { path: 'find-books', component: FindbooksComponent },
    { path: 'type-book/:id', component: TypingComponent },
    { path: '', redirectTo: '/find-books', pathMatch: 'full' }
  ];
