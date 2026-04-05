const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const xhrRequest = (method, url, body, extraHeaders = {}) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    const token = localStorage.getItem("session_token");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    if (body && !(body instanceof FormData)) {
      xhr.setRequestHeader("Content-Type", "application/json");
    }
    Object.entries(extraHeaders).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.responseType = "";
    xhr.onload = () => {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch (_) {}
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data, text: xhr.responseText });
    };
    xhr.onerror = () => reject(new Error("Network error. Please check your connection."));
    if (body instanceof FormData) {
      xhr.send(body);
    } else {
      xhr.send(body ? JSON.stringify(body) : null);
    }
  });
};

export const xhrGet = (url) => xhrRequest("GET", url);
export const xhrPost = (url, body) => xhrRequest("POST", url, body);
export const xhrPut = (url, body) => xhrRequest("PUT", url, body);
export const xhrDelete = (url) => xhrRequest("DELETE", url);

export const xhrGetBlob = (url) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    const token = localStorage.getItem("session_token");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.responseType = "blob";
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true, blob: xhr.response, status: xhr.status });
      } else {
        resolve({ ok: false, status: xhr.status });
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send();
  });
};

export { BACKEND_URL };
