// ============================================================
// Конфигурация — заполни перед деплоем
// ============================================================

window.APP_CONFIG = {
  SUPABASE_URL: "https://uooareqpvgoygzbzzmlj.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvb2FyZXFwdmdveWd6Ynp6bWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMDU1MjIsImV4cCI6MjA5Nzc4MTUyMn0.1K5x07ObZsWdDoKsu1X8ewiTYtLz-fLU5mpbtWF0aSk",

  // SHA-256 хэш пароля (hex), а не сам пароль в открытом виде.
  // Как получить: открой консоль браузера на этой же странице и выполни:
  //   await sha256Hex("твой_пароль")
  // Затем вставь результат сюда.
  PASSWORD_HASH: "PASTE_SHA256_HASH_HERE"
};
