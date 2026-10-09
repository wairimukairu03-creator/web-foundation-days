const noteText = document.getElementById('note-text');
const charCount = document.getElementById('char-count');
const wordCount = document.getElementById('word-count');
const clearBtn = document.getElementById('clear-btn');
const themeToggle = document.getElementById('theme-toggle');

function updateCounts() {
    const text = noteText.value;
    const charLength = text.length;

    const wordsArray = text.trim().split(/\s+/);
    const wordLength = text.trim() === '' ? 0 : wordsArray.length;

     charCount.textContent = `${charLength} / 200 characters`;
    wordCount.textContent = `${wordLength} words`;

       charCount.className = '';
    if (charLength > 200) {
        charCount.classList.add('over');
    } else if (charLength > 180) {
        charCount.classList.add('warning');
    }
}

function clearAll() {
    noteText.value = '';
    localStorage.removeItem('noteDraft');
    updateCounts();
}

noteText.addEventListener('input', () => {
    updateCounts();
    localStorage.setItem('noteDraft', noteText.value);
});

clearBtn.addEventListener('click', clearAll);

noteText.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        clearAll();
    }
});

themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    themeToggle.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    localStorage.setItem('themePreference', isDark ? 'dark' : 'light');
});


window.addEventListener('DOMContentLoaded', () => {
    
    const savedDraft = localStorage.getItem('noteDraft');
    if (savedDraft !== null) {
        noteText.value = savedDraft;
    }

    
    const savedTheme = localStorage.getItem('themePreference');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        themeToggle.textContent = 'Light Mode';
    } else {
        document.body.classList.remove('dark');
        themeToggle.textContent = 'Dark Mode';
    }

    
    updateCounts();
});