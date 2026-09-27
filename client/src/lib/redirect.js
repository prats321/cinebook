// Where to go after login. Only same-site paths are allowed, so a crafted
// link like /login?next=https://evil.com can't bounce users off-site.
export function safeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}
