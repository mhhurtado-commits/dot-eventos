document.addEventListener('DOMContentLoaded', () => {

  const btnGoogle = document.getElementById('btn-google');
  const btnLogin = document.getElementById('btn-login');

  // Login con Google
  btnGoogle.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) alert('Error al iniciar sesión con Google: ' + error.message);
  });

  // Login con email y contraseña
  btnLogin.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
      alert('Por favor completá el email y la contraseña.');
      return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert('Error al ingresar: ' + error.message);
    } else {
      window.location.href = 'pages/dashboard.html';
    }
  });

  // Verificar si ya hay sesión activa
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      window.location.href = 'pages/dashboard.html';
    }
  });

});