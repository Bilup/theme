

function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

const GITHUB_SCOPES = "user:email";

// 生成随机字符串
function generateRandomString(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// 生成PKCE code challenge
async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function initiateGitHubLogin() {
  if (!window.GITHUB_CLIENT_ID) {
    alert("GitHub client ID is not configured. Please contact the administrator.");
    return;
  }
  
  // 生成state和code verifier
  const state = generateRandomString(32);
  const codeVerifier = generateRandomString(128);
  
  // 存储到localStorage
  localStorage.setItem('github_state', state);
  localStorage.setItem('github_code_verifier', codeVerifier);
  
  // 生成code challenge
  generateCodeChallenge(codeVerifier).then(codeChallenge => {
    const redirectUri = window.location.origin + "/auth/github";
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${window.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(GITHUB_SCOPES)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    window.location.href = authUrl;
  });
}

window.addEventListener('load', async function () {
  const auth_token = getCookie("auth_token");
  if (auth_token != "") {
    const urlParams = new URLSearchParams(window.location.search);
    const next = urlParams.get('next');
    window.location.href = next || "/";
    return;
  }

  const githubBtn = document.getElementById('github-btn');
  if (githubBtn) {
    githubBtn.addEventListener('click', function(e) {
      e.preventDefault();
      initiateGitHubLogin();
    });
  }
  
  // Handle GitHub OAuth callback
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  const storedState = localStorage.getItem('github_state');
  
  if (code && state && state === storedState) {
    // 移除存储的state
    localStorage.removeItem('github_state');
    const codeVerifier = localStorage.getItem('github_code_verifier');
    localStorage.removeItem('github_code_verifier');
    
    try {
      const response = await fetch('/auth/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `code=${encodeURIComponent(code)}&code_verifier=${encodeURIComponent(codeVerifier)}`
      });
      
      if (response.ok) {
        const next = urlParams.get('next');
        window.location.href = next || "/";
      } else {
        console.error('GitHub authentication failed:', await response.text());
        alert('GitHub authentication failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during GitHub authentication:', error);
      alert('An error occurred during GitHub authentication. Please try again.');
    }
  }
});
