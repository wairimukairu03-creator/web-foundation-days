let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

function searchNotes(word) {
  const lowerWord = word.toLowerCase();
  return notes.filter(note => note.text.toLowerCase().includes(lowerWord));
};

function longestNote() {
  if (notes.length === 0) return null;
  
  let longest = notes[0];
  for (let i = 1; i < notes.length; i++) {
    if (notes[i].text.length > longest.text.length) {
      longest = notes[i];
    }
  }
  return longest;
}

function countByCategory() {
  const counts = {};
  for (const note of notes) {
    const cat = note.category;
    if (counts[cat]) {
      counts[cat]++;
    } else {
      counts[cat] = 1;
    }
  }
  return counts;
}

function getSummary() {
  const totalNotes = notes.length;
  const word = totalNotes === 1 ? "note" : "notes";
  const counts = countByCategory();
  
  const details = Object.entries(counts)
    .map(([category, count]) => `${count} ${category}`)
    .join(", ");
    
  return `${totalNotes} ${word}: ${details}`;
}

function isDuplicate(text) {
  const cleanedText = text.trim().toLowerCase();
  return notes.some(note => note.text.trim().toLowerCase() === cleanedText);
}


function addNote(text, category) {
  const allowedCategories = ["personal", "work", "study"];

  if (!text || text.length < 1 || text.length > 200) {
    console.log("Failed to add note: Text length must be between 1 and 200 characters.");
    return false;
  }

  if (!allowedCategories.includes(category)) {
    console.log(`Failed to add note: Category must be one of ${allowedCategories.join(", ")}.`);
    return false;
  }
  
  const nextId = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;
  notes.push({ id: nextId, text: text, category: category });
  return true;
}

console.log("--- Testing searchNotes ---");
console.log(searchNotes("javascript")); // Expected: Array with note id: 4
console.log(searchNotes("xyz"));        // Expected: [] (No results)

console.log("--- Testing longestNote ---");
console.log(longestNote());             // Expected: Note object with text "Email the project report to Grace"
// Edge case: Empty array test
const originalNotes = [...notes];
notes = [];
console.log(longestNote());             // Expected: null
notes = originalNotes;                  // Restore notes

console.log("--- Testing countByCategory ---");
console.log(countByCategory());         // Expected: { personal: 2, study: 2, work: 1 }

console.log("--- Testing getSummary ---");
console.log(getSummary());              // Expected: "5 notes: personal 2, study 2, work 1" (order might vary)

console.log("--- Testing isDuplicate ---");
console.log(isDuplicate("Buy milk and bread")); // Expected: true
console.log(isDuplicate("  buy milk AND bread  ")); // Expected: true (ignores case/spaces)
console.log(isDuplicate("Unique message"));      // Expected: false

console.log("--- Testing addNote ---");
console.log(addNote("Learn Node.js", "study")); // Expected: true (Successfully added)
console.log(addNote("Call mum", "personal"));    // Expected: false (Logs duplicate error)
console.log(addNote("", "work"));                // Expected: false (Logs character length error)
console.log(addNote("Valid text", "leasure"))