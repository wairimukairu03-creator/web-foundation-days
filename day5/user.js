
let usersArray = [];


const loadUsersBtn = document.getElementById('load-users');
const filterInput = document.getElementById('filter-input');
const statusSpan = document.getElementById('status');
const usersList = document.getElementById('users-list');


async function loadUsers() {
    try {
        loadUsersBtn.disabled = true;
        statusSpan.textContent = 'Loading...';
        usersList.innerHTML = ''; 

        const response = await fetch('https://jsonplaceholder.typicode.com/users');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        usersArray = await response.json();
        statusSpan.textContent = 'Users loaded successfully!';
        renderUsers(usersArray);
        
    } catch (error) {
        statusSpan.textContent = `Error loading users: ${error.message}`;
    } finally {
        loadUsersBtn.disabled = false;
    }
}
function renderUsers(list) {
    usersList.innerHTML = '';
    
    if (list.length === 0) {
        usersList.textContent = 'No users match your filter.';
        return;
    }

    list.forEach(user => {
        const li = document.createElement('li');
        
        const name = user.name || 'N/A';
        const email = user.email || 'N/A';
        const city = user.address?.city || 'N/A';
        const companyName = user.company?.name || 'N/A';

        li.textContent = `${name} (${email}) | City: ${city} | Company: ${companyName}`;
        usersList.appendChild(li);
    });
}

loadUsersBtn.addEventListener('click', loadUsers);

filterInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredUsers = usersArray.filter(user => 
        user.name.toLowerCase().includes(searchTerm)
    );
    renderUsers(filteredUsers);
});
