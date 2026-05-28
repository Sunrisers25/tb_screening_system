import { API_BASE_URL } from "./config";

export async function authenticatedFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("token");
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // Only redirect if we are not already on the login page
    if (!window.location.pathname.endsWith("/login") && window.location.pathname !== "/") {
      window.location.href = "/login";
    }
  }
  
  return response;
}
