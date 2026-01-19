document.getElementById('register-form').addEventListener('submit', function (e) {
    e.preventDefault(); // Previene recargar la página

    const email = document.querySelector('input[name="email"]').value;
    const language = document.querySelector('select[name="language"]').value;

    fetch('https://ffforward.app.n8n.cloud/webhook/registro_usuario', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, language })
    })  
    .then(response => {
        if (response.ok) {
            alert("Registration successful!");
        } else {
            alert("Error");
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Error de red o del servidor");
    });
});
