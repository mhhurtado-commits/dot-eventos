document.addEventListener('DOMContentLoaded', async () => {

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    window.location.href = '/pages/dashboard';
    return;
  }

  document.getElementById('btn-google').addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://dot-eventos.pages.dev/pages/dashboard' }
    });
    if (error) alert('Error: ' + error.message);
  });

  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) { alert('Completá email y contraseña.'); return; }

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) alert('Error: ' + error.message);
    else window.location.href = '/pages/dashboard';
  });

});