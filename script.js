
function openModal(tab) {
    document.getElementById('modal').classList.add('active');
    switchTab(tab);
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(function(item) {
        item.classList.remove('active');
    });

    document.getElementById('content-' + tab).classList.add('active');
}

function setRole(role) {
    document.getElementById('pharmacy-extra').style.display =
        role === 'pharmacy' ? 'block' : 'none';

    document.getElementById('reg-name').placeholder =
        role === 'pharmacy' ? 'Owner Name' : 'Full Name';

    document.querySelector('#pharmacy-extra input').required =
        role === 'pharmacy';
}

document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

document.querySelector('.search').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Medicine search requires a database connection.');
});

document.querySelectorAll('.tab-content').forEach(function(form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Connect a backend to enable account access.');
    });
});