## **1. Overview**

The application is a map-centric web platform, similar in style to Google Maps, with an integrated search bar, user authentication system, and a user dashboard for accessing various features. The primary goal is to provide a clean, minimal, and aesthetically pleasing UI while maintaining a logical and efficient routing flow.

---

## **2. Home Screen (Public View)**

**Purpose:** First point of interaction for visitors.

- **Map Display**
    
    - Full-page base map (e.g., Google Maps API, Leaflet, Mapbox).
        
    - No navigation bar or side panels by default.
        
    - The map should occupy **100% width and height** of the viewport.
        
- **Search Option**
    
    - Positioned at **top-left** corner, floating over the map.
        
    - Minimal transparency for aesthetics (e.g., semi-transparent white background, rounded corners, shadow).
        
    - Functionality to search for locations and display on the map.
        
- **User Authentication Entry**
    
    - **Sign In / Sign Up** button placed at **top-right corner**, floating over the map.
        
    - Clicking opens a dedicated **Login / Sign Up** page.
### Link:
[[home-page]]
        

---

## **3. Authentication**

**Purpose:** Secure user login and account management.

- **Login / Sign Up Page**
    
    - Modern, aesthetically pleasing design (centered card, background image or gradient).
        
    - Input fields: Email, Password (Sign Up may also include Name, Confirm Password).
        
    - Buttons: "Login", "Sign Up", "Forgot Password".
        
    - Client-side form validation.
        
    - Smooth transitions and animations.
        
- **Backend Requirements**
    
    - **User Database:** Store user credentials and profile details.
        
    - Recommended tech stack: PostgreSQL / MySQL for relational structure; bcrypt for password hashing.
        
    - Authentication: JWT or session-based authentication.
        
    - API endpoints:
        
        - `POST /auth/signup`
            
        - `POST /auth/login`
            
        - `GET /auth/logout`
            
        - `GET /auth/user` (to fetch user info when logged in)
            

---

## **4. Post-Login Dashboard**

**Purpose:** Provide users with navigation and map-related functionalities.

- **Dashboard Layout**
    
    - **Navigation Bar** at top (sticky).
        
    - Minimal, clean design with hover animations.
        
    - Routes in navbar:
        
        1. **Map**
            
            - Displays the same base map as the home screen.
                
            - Retain search functionality from the home page.
                
        2. **Get API** _(Default page after login)_
            
            - A page to request/generate API keys.
                
        3. **API View**
            
            - Page to view API usage, statistics, or related info.
                
        
        - (Future routes can be added later.)
            
- **Routing Logic**
    
    - Public routes: `/` (home map), `/login`, `/signup`
        
    - Protected routes (dashboard only if logged in): `/dashboard/map`, `/dashboard/get-api`, `/dashboard/api-view`
        
    - Redirect unauthorized users trying to access protected routes back to `/login`.
        

---

## **5. Steps to Set Up User Database**

**Recommended Approach:**

1. **Database Creation**
    
    - Choose PostgreSQL/MySQL.
        
    - Create `users` table with fields: `id`, `name`, `email` (unique), `password_hash`, `created_at`.
        
2. **Backend API**
    
    - Use Node.js + Express / Django / Flask to handle requests.
        
    - Implement:
        
        - `POST /auth/signup` → hash password with bcrypt before storing.
            
        - `POST /auth/login` → verify password, generate JWT.
            
        - `GET /auth/user` → return logged-in user details.
            
3. **Security**
    
    - Use HTTPS.
        
    - Store passwords only in hashed form.
        
    - Use environment variables for DB credentials and JWT secret.
        
4. **Testing**
    
    - Create test accounts.
        
    - Test login, logout, and token validation.
        

---

## **6. UI/UX Guidelines**

- Use **responsive design** for both desktop and mobile.
    
- Keep all floating elements semi-transparent with soft shadows for readability over the map.
    
- Smooth transitions when switching routes.
    
- Consistent color theme across the app.
    
- Dashboard should feel lightweight but professional.
    

---

## **7. Tech Stack Recommendations**

- **Frontend:** React.js / Next.js (for routing, component reusability), Tailwind CSS or Material UI.
    
- **Map Library:** Mapbox GL JS / Leaflet.js / Google Maps JS API.
    
- **Backend:** Node.js (Express) / Django REST Framework / Flask.
    
- **Database:** PostgreSQL / MySQL.
    
- **Auth:** JWT-based authentication.
    
- **Hosting:** Vercel/Netlify for frontend, Railway/Render/Heroku for backend.