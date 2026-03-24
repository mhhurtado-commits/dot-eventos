document.addEventListener('DOMContentLoaded', () => {

  const btnGoogle = document.getElementById('btn-google');
  const btnLogin = document.getElementById('btn-login');

  btnGoogle.addEventListener('click', () => {
    window.location.href = '/pages/dashboard';
  });

  btnLogin.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    if (!email) {
      alert('Por favor ingresá tu email.');
      return;
    }
    window.location.href = '/pages/dashboard';
  });

});