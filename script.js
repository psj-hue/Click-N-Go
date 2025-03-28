// -------------------------------------
// --- Firebase Initialization ---
// -------------------------------------
// Make sure HTML includes <script type="module" src="script.js">

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged // Optional: Listener for auth state changes
    // Additional methods if migrating local email/pass:
    // createUserWithEmailAndPassword,
    // signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ---=== YOUR FIREBASE CONFIGURATION ===---
// Replace placeholders below if necessary, but use the values from your Firebase Console Project Settings
const firebaseConfig = {
  apiKey: "AIzaSyDB5HOMSqUgpO9Dy3GhI9-vhemmr9sATmg",
  authDomain: "click-n--go.firebaseapp.com",
  databaseURL: "https://click-n--go-default-rtdb.firebaseio.com", // If using Realtime DB
  projectId: "click-n--go",
  storageBucket: "click-n--go.appspot.com", // Common convention, verify in console
  messagingSenderId: "697356789668",
  appId: "1:697356789668:web:33eab0fc45e56274ef8331",
  measurementId: "G-G95S72XP35" // Optional for Analytics
};
// -------------------------------------------

// Initialize Firebase Globals (Declare before first use)
let app;
let analytics;
let auth;
let googleProvider;

try {
    // Initialize the core Firebase app
    app = initializeApp(firebaseConfig);

    // Initialize Analytics (optional, check for valid ID)
    if (firebaseConfig.measurementId && firebaseConfig.measurementId.startsWith('G-')) {
        analytics = getAnalytics(app);
    } else {
        console.warn("Firebase Analytics not initialized: measurementId missing/invalid.");
    }

    // Initialize Firebase Authentication
    auth = getAuth(app);

    // Initialize Google Auth Provider for Google Sign-In
    googleProvider = new GoogleAuthProvider();

    console.log("Firebase Initialized Successfully.");

} catch (error) {
    // Handle critical initialization errors
    console.error("FATAL: Firebase Initialization Failed:", error);
    alert("Critical Error: Could not initialize required services. Please check configuration or network connection.");
    // Replace page content with an error message to prevent broken UI
    document.body.innerHTML = `<div style='padding: 30px; text-align: center; color: red;'><h2>Initialization Error</h2><p>Could not connect to critical services. Please check the console log or contact support.</p></div>`;
    // Stop further script execution
    throw new Error("Firebase Initialization Failed - Application cannot continue.");
}


// --- SECURITY WARNINGS --- //
// 1. User Data Storage: Using localStorage for custom data (role, location, phone) is simple but NOT secure for sensitive info and doesn't sync across devices. Strongly consider using Firestore or Realtime Database with appropriate Security Rules linked to the Firebase User ID (uid) for production apps.
// 2. Local Email/Password System: The included Email/Password sign-up and login system (using `signUp`, `verifyOTP`, `login`) stores passwords INSECURELY in localStorage. This is DANGEROUS for production. Migrate this functionality fully to Firebase Authentication methods (`createUserWithEmailAndPassword`, `signInWithEmailAndPassword`) or remove it completely.
// 3. Firebase Security Rules: You MUST configure Firebase Security Rules (for Firestore, Realtime DB, Storage) to protect your data from unauthorized access. Start immediately in the Firebase Console under the respective service's "Rules" tab. Without proper rules, your data is likely vulnerable.
// ------------------------ //

// --- Global Variables ---
let currentUser = null; // Holds the application's state object for the currently logged-in user


// --- Initialization & Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Check if Firebase Auth was successfully initialized before proceeding
    if (!auth) {
        console.error("Firebase Auth instance is not available during DOMContentLoaded. Application may be broken.");
        return; // Prevent errors if Firebase init failed critically
    }
    // Determine initial logged-in state (using localStorage as primary or secondary source)
    initializeAuthenticationState();
    // Set up event handlers for forms and buttons
    attachEventListeners();
    // Load non-dynamic content like FAQs and apply preferences
    loadStaticData();
    // Start any timers needed (like the clock)
    startTimers();
});

/** Checks localStorage for a previously logged-in user session */
function initializeAuthenticationState() {
    const storedUser = localStorage.getItem('clickngoUser');
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            console.log("Restored user session from localStorage:", currentUser?.email);
            // Update the UI based on the restored user data
            updateUIForSignedInUser(currentUser);
        } catch (e) {
            console.error("Error parsing stored user data from localStorage:", e);
            localStorage.removeItem('clickngoUser'); // Clear potentially corrupted data
            resetToAuthState(); // Show the login page if data is bad
        }
    } else {
        // If no user found in local storage, ensure the login page is shown
        console.log("No user found in localStorage. Displaying authentication page.");
        resetToAuthState();
    }
    // Optional: Implement robust Firebase state listener (onAuthStateChanged) here
    // to keep UI perfectly in sync with actual Firebase session status.
}

/** Sets up event listeners for forms and attaches functions to window for inline onclicks */
function attachEventListeners() {
    console.log("Attaching event listeners...");
    // Form submission handlers
    document.getElementById('loginFormElem')?.addEventListener('submit', login);
    document.getElementById('signupFormElem')?.addEventListener('submit', signUp);
    document.getElementById('feedbackForm')?.addEventListener('submit', submitFeedback);

    // Expose necessary functions globally for use by inline HTML onclick handlers
    // Note: A more modern approach avoids inline onclicks and uses addEventListener exclusively.
    window.showLoginForm = showLoginForm;
    window.showSignUpForm = showSignUpForm;
    window.verifyOTP = verifyOTP;           // Used by local signup simulation
    window.clearInput = clearInput;         // Input field 'X' button
    window.switchSection = switchSection;   // Main app navigation
    window.logoutFirebase = logoutFirebase; // *** Correct Logout Function ***
    window.deleteAccount = deleteAccount;     // Account deletion handler
    window.toggleDarkMode = toggleDarkMode; // Theme toggle handler
    window.savePreferences = savePreferences; // Settings save handler
    window.simulateOrder = simulateOrder;   // Demo feature trigger
    window.showOrderHistory = showOrderHistory; // Feature trigger
    window.signInWithGoogleFirebase = signInWithGoogleFirebase; // *** Correct Google Sign-In Function ***
    window.sendMessage = sendMessage;       // Demo chat send button
}

/** Loads static application data like FAQs and applies stored preferences */
function loadStaticData() {
    console.log("Loading static data (FAQ, Preferences)...");
    loadFaq(); // Populate the FAQ section
    loadPreferences(); // Apply theme and language settings
}

/** Initializes timers, such as the live clock update */
function startTimers() {
    console.log("Starting timers (Clock)...");
    updateClock(); // Initial clock display
    displayWelcomeMessage(); // Initial welcome message
    setInterval(updateClock, 1000); // Update clock every second
}

// --- UI Management Functions ---

/** Updates the entire UI to reflect the state of a signed-in user */
function updateUIForSignedInUser(user) {
    if (!user || !user.email) { // Basic check for a valid user object
        console.warn("updateUIForSignedInUser called with invalid user object. Resetting to auth state.", user);
        resetToAuthState();
        return;
    }
    console.log("Updating UI for signed-in user:", user.email);
    // Show the main application section, hide authentication & OTP sections
    toggleVisibility('authSection', 'appSection');
    toggleVisibility('otpPage', null); // Explicitly hide OTP page

    populateAccountInfo(user);      // Display user details in Account section and header
    displayDashboard(user.role);    // Show relevant panels (customer vs driver)
    updateMap();                    // Update location/map placeholders
    loadPreferences();              // Ensure theme (like dark mode) is correctly applied

    // Navigate to the default 'home' section after login
    switchSection('homeSection');
}

/** Resets the UI to the logged-out state, showing the Login form */
function resetToAuthState() {
    console.log("Resetting UI to authentication (logged-out) state.");
    toggleVisibility('appSection', 'authSection'); // Show Auth, Hide App
    toggleVisibility('otpPage', null);             // Hide OTP if visible
    showLoginForm(); // Ensure Login form is visible within the Auth section
    // Potentially clear any user-specific data displayed elsewhere if needed
}

/** Utility to hide one element (by ID) and show another (by ID) */
function toggleVisibility(hideId, showId) {
    const hideEl = document.getElementById(hideId);
    if (hideEl) {
        hideEl.style.display = 'none'; // Hide the specified element
    } else if (hideId) {
        // Log a warning if the element to hide wasn't found (unless hideId is null)
        // console.warn(`Element to hide not found: #${hideId}`);
    }

    if (showId) {
         const showEl = document.getElementById(showId);
         if (showEl) {
             showEl.style.display = 'block'; // Show the specified element (adjust display type if needed)
         } else {
             // Log an error if the element to show couldn't be found
             console.error(`Element to show not found: #${showId}`);
         }
    }
}

/** Switches the currently visible content section within the main application area */
function switchSection(sectionId) {
    console.log(`Navigating app view to section: #${sectionId}`);
    // Hide all direct children sections within the app's main content area
    document.querySelectorAll('#appSection > main > .content-section').forEach(sec => {
        sec.style.display = 'none';
    });

    // Special Handling for Admin Panel nested within the Account Section
    const adminPanel = document.getElementById('adminSection');
    if (adminPanel) {
        // Determine if the admin panel should be visible
        const showAdminPanel = (sectionId === 'accountSection' && currentUser?.role === 'admin');
        adminPanel.style.display = showAdminPanel ? 'block' : 'none';
        // If showing the admin panel, load the user list
        if (showAdminPanel) {
            console.log("Admin panel should be visible. Loading users...");
            loadAllUsers();
        }
    }

    // Show the target content section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block'; // Make the selected section visible
    } else {
        // Fallback if the target section ID doesn't exist
        console.error(`Target section "#${sectionId}" not found! Defaulting to home.`);
        const homeSection = document.getElementById('homeSection');
        if (homeSection) homeSection.style.display = 'block'; // Show home as fallback
        sectionId = 'homeSection'; // Correct the ID for nav highlighting if fallback occurred
    }

    // Update map elements if the current section requires it (Home or Orders)
    if (sectionId === 'orderItemsSection' || sectionId === 'homeSection') {
        console.log("Updating map display for current section.");
        updateMap();
    }

    // Update active state on bottom navigation buttons
    document.querySelectorAll('#bottomNav button').forEach(button => {
        // Remove active class from all buttons first
        button.classList.remove('active');
        // Add active class if the button's onclick matches the current section
        if (button.getAttribute('onclick')?.includes(`switchSection('${sectionId}')`)) {
            button.classList.add('active');
        }
    });
}

/** Toggles visibility between Login and Sign Up forms */
function toggleAuth(formIdToShow) {
    console.log(`Toggling authentication form view to: ${formIdToShow}`);
    const signUpFormDiv = document.getElementById('signUpForm');
    const loginFormDiv = document.getElementById('loginForm');

    if (signUpFormDiv) signUpFormDiv.style.display = (formIdToShow === 'signUpForm' ? 'block' : 'none');
    if (loginFormDiv) loginFormDiv.style.display = (formIdToShow === 'loginForm' ? 'block' : 'none');

    clearAllErrors(); // Clear validation errors when switching
    displayStatus('authMessage', '', null); // Clear any lingering status messages
}
function showLoginForm() { toggleAuth('loginForm'); } // Convenience function for onclick
function showSignUpForm() { toggleAuth('signUpForm'); } // Convenience function for onclick

/** Shows/hides Customer Order Panel and Driver Request Panel based on user role */
function displayDashboard(role) {
    console.log(`Configuring dashboard panels based on role: ${role}`);
    const orderPanel = document.getElementById('orderPanel');    // For Customers
    const requestPanel = document.getElementById('orderRequestPanel'); // For Drivers

    // Set visibility based on role
    if (orderPanel) orderPanel.style.display = (role === 'customer') ? 'block' : 'none';
    if (requestPanel) requestPanel.style.display = (role === 'driver') ? 'block' : 'none';
    // Admins see neither panel by default in this logic
}

/** Updates map placeholder text in Home and Order sections */
function updateMap() {
    const location = currentUser?.location || 'Location Not Set';
    console.log(`Updating map placeholder elements with location: "${location}"`);
    // Update location text elements
    setText('userLocationDisplay', location);       // Display in Orders section
    setText('userLocationDisplayHome', location);   // Display in Home section preview

    // Update placeholder map container text
    const mapText = `(Map placeholder showing area near <strong>${location || '?'}</strong> - Requires map API integration)`;
    setTextHTML('mapPlaceholder', mapText);       // Full map placeholder in Orders section
    setTextHTML('mapPlaceholderSmall', mapText);    // Small map preview in Home section
}

/** Populates user details in the Account section UI */
function populateAccountInfo(user) {
     if (!user) {
         console.warn("Attempted to populate account info with null user.");
         // Optionally clear fields if called with null user during logout?
         // setText('accountEmail', ''); ... etc.
         return;
     }
     console.log(`Populating account info fields for user: ${user.email}`);
     // Set text content of various spans using the utility function
     setText('accountEmail', user.email);
     setText('accountName', user.displayName || '(No name set)'); // Use name, provide fallback
     setText('accountLocation', user.location || 'N/A');
     setText('accountPhone', user.phone || 'N/A');
     setText('userRole', user.role || 'N/A');
     setText('accountUid', user.uid || 'N/A (Local Account)'); // Display UID, clarify if local

     // Update the welcome message in the main app header
     setText('userEmailDisplay', user.displayName || user.email); // Prefer display name
}

// --- Authentication Functions ---

/** Initiates Google Sign-In process using Firebase Authentication */
function signInWithGoogleFirebase() {
    // Ensure Firebase Auth is ready
    if (!auth || !googleProvider) {
        console.error("Firebase Authentication service or Google Provider not initialized.");
        displayStatus('authMessage', 'Authentication service is not ready. Please refresh.', 'error');
        return;
    }
    console.log("Initiating Google Sign-In via Firebase Popup...");
    // Provide user feedback
    displayStatus('authMessage', 'Opening Google Sign-In...', 'loading');

    // Trigger the Firebase popup sign-in flow
    signInWithPopup(auth, googleProvider)
      .then((result) => {
        // Successful authentication
        const credential = GoogleAuthProvider.credentialFromResult(result); // Optional credential info
        const firebaseUser = result.user; // The authenticated Firebase user object
        console.log("Firebase Google Sign-In SUCCESS:", { email: firebaseUser.email, uid: firebaseUser.uid, name: firebaseUser.displayName });
        displayStatus('authMessage', `Signed in as ${firebaseUser.email}. Finalizing profile...`, 'success');

        // --- Adapt Firebase User data to application's 'currentUser' structure ---
        const uid = firebaseUser.uid;
        const email = firebaseUser.email;
        // Use display name from Google, or generate a fallback from email
        const displayName = firebaseUser.displayName || email.split('@')[0];

        // ** CRITICAL AREA for supplemental data **
        // Determine/Retrieve Role, Location, Phone.
        // This example checks localStorage keyed by UID, or uses basic prompts as a fallback.
        // !!! Replace localStorage/prompts with database lookups (e.g., Firestore `getDoc(doc(db, 'users', uid))`) in production. !!!
        console.log(`Looking up/prompting for supplemental data for UID: ${uid}`);
        let role = localStorage.getItem(`role_${uid}`) || promptUserForRole(displayName);
        let location = localStorage.getItem(`location_${uid}`) || promptUserForLocation();
        let phone = localStorage.getItem(`phone_${uid}`) || promptUserForPhone();

        // Create the application's currentUser object
        currentUser = {
          email: email,
          uid: uid,
          displayName: displayName,
          photoURL: firebaseUser.photoURL, // Store photo URL
          role: role,
          location: location,
          phone: phone,
          isFirebaseUser: true // Mark this as a user managed by Firebase Auth
        };

         // Persist supplemental info (potentially retrieved/prompted) back to localStorage (simple persistence mechanism)
         // In production, this data would ideally already be in or written to your database.
         console.log("Persisting supplemental data to localStorage (role, location, phone) for UID:", uid);
         localStorage.setItem(`role_${uid}`, currentUser.role);
         localStorage.setItem(`location_${uid}`, currentUser.location);
         localStorage.setItem(`phone_${uid}`, currentUser.phone);
         // Persist the main user object for simple session handling via localStorage
         localStorage.setItem('clickngoUser', JSON.stringify(currentUser));

        // Update the UI to the logged-in state after a brief confirmation message
        setTimeout(() => {
             updateUIForSignedInUser(currentUser); // Switch to app view, populate fields
             displayStatus('authMessage', '', null); // Clear the "Finalizing..." message
        }, 600); // Short delay

      })
      .catch((error) => {
        // Handle errors during the sign-in process
        console.error("Firebase Google Sign-In Error:", error);
        let userMessage = `Google Sign-In Error: ${error.message}`; // Default Firebase error message
        // Provide more user-friendly messages for common errors
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            userMessage = 'Google Sign-in window closed before completion.';
        } else if (error.code === 'auth/account-exists-with-different-credential') {
             userMessage = 'This email is already associated with a password account. Please sign in using your password.';
        } else if (error.code === 'auth/unauthorized-domain') {
             userMessage = 'This website domain is not authorized for sign-in (Check Firebase console > Auth > Settings > Authorized Domains).';
        }
        // Display error to the user
        displayStatus('authMessage', userMessage, 'error');
      });
}

/** Signs the user out using Firebase Authentication */
function logoutFirebase() {
    if (!auth) { console.error("Firebase Auth is not ready for logout."); return; }
    const userEmailForLog = currentUser?.email; // Get email before clearing currentUser
    console.log(`Attempting Firebase Sign Out for user: ${userEmailForLog || '(unknown)'}`);

    signOut(auth).then(() => {
        console.log("Firebase Sign Out successful.");
        // Clear application state and local storage session
        currentUser = null;
        localStorage.removeItem('clickngoUser');
        // Note: Supplemental localStorage data (role_uid, etc.) is not cleared on simple logout,
        // it will just be unused until a user with that UID logs in again.

        // Reset UI to show login page
        resetApp();
        // Provide feedback to user
        displayStatus('authMessage', 'You have been logged out.', 'success');
        // Clear logout message after a few seconds
        setTimeout(() => displayStatus('authMessage', '', null), 3500);

    }).catch((error) => {
        console.error("Firebase Sign Out Error:", error);
        // Attempt local cleanup anyway as a fallback? Or just show error?
        currentUser = null; // Try clearing state even if FB error occurred
        localStorage.removeItem('clickngoUser');
        resetApp(); // Show login page
        alert(`An error occurred during logout: ${error.message}. You may need to refresh the page.`);
    });
}


// --- ** INSECURE ** Local Email/Password Functions (Uses LocalStorage) ---
// --- WARNING: Stores passwords insecurely. NOT for production. ---

/** Handles submission of the LOCAL email/password signup form */
async function signUp(event) {
    event.preventDefault();
    console.warn("Executing INSECURE local email/password signup...");
    clearAllErrors();

    // Gather form data
    const email = document.getElementById('signUpEmail')?.value.trim();
    const password = document.getElementById('signUpPassword')?.value.trim();
    const location = document.getElementById('signUpLocation')?.value.trim();
    const phone = document.getElementById('signUpPhone')?.value.trim();
    const role = document.getElementById('signUpRole')?.value;

    // --- Form Validation ---
    let isValid = true;
    if (!email || !isValidEmail(email)) { displayError('signUpEmailError', 'Valid email required.'); isValid = false; }
    if (!password || password.length < 6) { displayError('signUpPasswordError', 'Password must be at least 6 characters.'); isValid = false; }
    if (!location) { displayError('signUpLocationError', 'Location is required.'); isValid = false; }
    if (!phone || !isValidPhoneNumber(phone)) { displayError('signUpPhoneError', 'Valid phone number required.'); isValid = false; }
    if (!role) { displayError('signUpRoleError', 'Please select your role.'); isValid = false; }
    if (!isValid) {
        console.warn("Local signup validation failed.");
        return; // Stop if validation fails
    }

    // --- Check if email already exists in local storage users ---
    try {
         const users = JSON.parse(localStorage.getItem('clickngoUsers') || '[]');
         if (users.some(u => u.email === email)) {
             displayError('signUpEmailError', 'This email address is already registered locally or via Google. Please try logging in.');
             return;
         }
    } catch (e) {
         console.error("Error reading local users during signup check:", e);
         alert("Error checking existing users. Please try again.");
         return;
    }


    // --- Proceed to OTP Simulation (Demo Only) ---
    const otp = generateOTP();
    // Store data needed after OTP step temporarily in session storage
    sessionStorage.setItem('signUpData', JSON.stringify({ email, password, location, phone, role, otp }));
    // !!! INSECURE: Show OTP in UI for demo convenience !!!
    setText('otpMessage', `Enter code for ${email} (Demo Only: ${otp})`);
    console.log(`INSECURE DEMO: Generated OTP ${otp} for local signup: ${email}`);
    // Switch view to OTP entry page
    toggleVisibility('authSection', 'otpPage');
}

/** Generates a simple 6-digit OTP string (for local demo simulation) */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Verifies the simulated OTP entered by the user for LOCAL signup */
function verifyOTP() {
    console.warn("Verifying OTP for INSECURE local signup...");
    clearAllErrors('otpError', 'otpStatus'); // Clear previous messages
    const enteredOTP = document.getElementById('otpInput')?.value.trim();
    const otpInputEl = document.getElementById('otpInput');
    const signUpDataString = sessionStorage.getItem('signUpData'); // Retrieve stored data

    // --- Basic Validation ---
    if (!signUpDataString || !enteredOTP) {
        displayError('otpError', "OTP session expired or no OTP entered. Please sign up again.");
        resetToAuthState(); // Send user back to signup/login start
        return;
    }
    let signUpData;
    try { // Safely parse the session data
        signUpData = JSON.parse(signUpDataString);
    } catch (e) {
        console.error("Error parsing session storage OTP data:", e);
        displayError('otpError', "Internal data error. Please sign up again.");
        sessionStorage.removeItem('signUpData'); // Clear bad data
        resetToAuthState(); return;
    }
    // Check if data seems complete
    if (!signUpData || !signUpData.otp || !signUpData.email || !signUpData.password) {
        displayError('otpError', "Incomplete registration data. Please sign up again.");
        sessionStorage.removeItem('signUpData');
        resetToAuthState(); return;
    }

    // --- Check OTP Match ---
    if (enteredOTP === String(signUpData.otp)) { // Compare entered OTP with stored OTP
        console.log(`Local OTP verification SUCCESS for: ${signUpData.email}`);
        displayStatus('otpStatus', 'Verifying OTP...', 'loading');

        // Simulate short delay before proceeding
        setTimeout(() => {
            try {
                // Double check email doesn't exist in localStorage before adding
                let users = JSON.parse(localStorage.getItem('clickngoUsers') || '[]');
                 if (users.some(u => u.email === signUpData.email)) {
                    console.error(`Local signup race condition: User ${signUpData.email} created between OTP generation and verification.`);
                    displayError('otpError', "This email address was just registered. Please login.");
                    displayStatus('otpStatus', '', null);
                    sessionStorage.removeItem('signUpData');
                    resetToAuthState();
                    return;
                }

                // !!! Create New User Object - WARNING: Storing Plaintext Password !!!
                const newUser = {
                    email: signUpData.email,
                    password: signUpData.password, // !!! HIGHLY INSECURE !!!
                    location: signUpData.location,
                    phone: signUpData.phone,
                    role: signUpData.role,
                    uid: `local_${Date.now()}`, // Create a basic unique ID for local users
                    isFirebaseUser: false // Flag as locally managed
                 };
                 console.log("Creating INSECURE local user entry:", newUser.email);
                 users.push(newUser); // Add to user array
                 localStorage.setItem('clickngoUsers', JSON.stringify(users)); // Save updated list

                 sessionStorage.removeItem('signUpData'); // Clean up temp session data

                 // Log the user in immediately after local signup
                 currentUser = newUser;
                 localStorage.setItem('clickngoUser', JSON.stringify(currentUser)); // Persist this local session

                displayStatus('otpStatus', 'OTP Verified! Registration successful. Loading app...', 'success');
                // Switch to main app view after short delay
                setTimeout(() => {
                    updateUIForSignedInUser(currentUser);
                    displayStatus('otpStatus', '', null); // Clear OTP status message
                }, 900);

            } catch (storageError) { // Handle potential errors writing to localStorage
                console.error("Error saving LOCAL user registration to localStorage:", storageError);
                displayError('otpError', "Failed to save registration details.");
                displayStatus('otpStatus', '', null);
            }
        }, 1100); // Simulate backend processing time

    } else { // OTP did not match
        console.log(`Local OTP verification FAILED for: ${signUpData.email}`);
        displayError('otpError', "Incorrect OTP code entered. Please try again.");
        if (otpInputEl) otpInputEl.value = ''; // Clear the wrong code
        displayStatus('otpStatus', '', null); // Clear any status message
    }
}

/** Handles submission of the LOCAL email/password login form */
async function login(event) {
    event.preventDefault(); // Prevent page reload
    console.warn("Attempting INSECURE local email/password login...");
    clearAllErrors(); // Clear previous messages

    // Get credentials from form
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value.trim();
    const loginErrorEl = document.getElementById('loginError'); // Preferred error display element

    // Basic validation
    if (!email || !password) {
        // Use the specific login error element if available, otherwise fallback
        displayError(loginErrorEl ? 'loginError' : 'loginEmailError', 'Both Email and Password are required.');
        return;
    }

    // --- Look up user in localStorage ---
    try {
        const users = JSON.parse(localStorage.getItem('clickngoUsers') || '[]');
        // !!! INSECURE PASSWORD COMPARISON & Only matches local users !!!
        const user = users.find(u =>
            u.email === email &&
            u.password === password && // Direct password comparison is BAD
            !u.isFirebaseUser          // Ensure it's not a Firebase user trying local login
        );

        if (user) { // Login successful
            console.log(`INSECURE local login successful for: ${email}`);
            displayStatus('authMessage', 'Login successful! Loading dashboard...', 'success');
            currentUser = user; // Set application state
            localStorage.setItem('clickngoUser', JSON.stringify(currentUser)); // Persist session locally

            // Simulate loading dashboard
            setTimeout(() => {
                 updateUIForSignedInUser(currentUser); // Switch to main app view
                 displayStatus('authMessage', '', null); // Clear success message after loading
            }, 1000);

        } else { // Login failed
            console.log(`INSECURE local login failed for: ${email}`);
            // Provide generic error message for security
            displayError(loginErrorEl ? 'loginError' : 'loginEmailError', 'Invalid email or password for a local account.');
            displayStatus('authMessage', '', null); // Clear any other status messages
        }
    } catch(e) {
        console.error("Error during local login check:", e);
        displayError(loginErrorEl ? 'loginError' : 'loginEmailError', 'An error occurred during login. Please try again.');
        displayStatus('authMessage', '', null);
    }
}
// --- End of Insecure Local Auth Section ---


// --- User Profile & Admin Functions ---

/** Loads all users (from localStorage) for display in the Admin Panel */
async function loadAllUsers() {
    console.log("Admin Action: Loading all users from localStorage...");
    const allUsersElement = document.getElementById('allUsers');
    if (!allUsersElement) { console.error("Admin Panel: #allUsers element not found in HTML."); return; }

    allUsersElement.innerHTML = '<div class="loading-message loading">Loading user list...</div>'; // Show loading state

    // Use setTimeout to simulate network/processing delay if data were external
    setTimeout(() => {
        try {
             // Read the list of users directly from local storage
             const users = JSON.parse(localStorage.getItem('clickngoUsers') || '[]');
             console.log(`Found ${users.length} users in localStorage for admin view.`);
             allUsersElement.innerHTML = ''; // Clear loading message

             if (users.length === 0) {
                 allUsersElement.innerHTML = '<p>No users are currently registered in local storage.</p>';
                 return; // Stop if no users
             }

             // Build the list UI
             const userList = document.createElement('ul');
             userList.style.listStyleType = 'none'; // Remove default bullets
             userList.style.paddingLeft = '0'; // Remove default padding

             users.forEach(user => {
                 const item = document.createElement('li');
                 item.style.marginBottom = '15px'; // Add vertical space between users
                 item.style.paddingBottom = '10px'; // Padding before the border
                 item.style.borderBottom = '1px dotted #ccc'; // Separator

                 // Construct display HTML - AVOID showing passwords!
                 let userInfoHtml = `
                    <strong>Email:</strong> ${user.email || 'N/A'}<br>
                    ${user.displayName ? `<strong>Name:</strong> ${user.displayName}<br>` : ''}
                    ${user.uid ? `<strong>UID:</strong> <small>${user.uid}</small><br>` : ''}
                    <strong>Location:</strong> ${user.location || 'N/A'}<br>
                    <strong>Phone:</strong> ${user.phone || 'N/A'}<br>
                    <strong>Role:</strong> ${user.role || 'N/A'}<br>
                    <small>(${user.isFirebaseUser ? 'Firebase Authenticated' : 'Local Email/Password'})</small>
                 `;
                 item.innerHTML = userInfoHtml;
                 userList.appendChild(item);
             });
             allUsersElement.appendChild(userList); // Add the complete list to the page

        } catch (e) { // Handle errors during parsing or UI creation
             console.error("Error loading or displaying users for admin panel:", e);
             allUsersElement.innerHTML = '<p class="error-message">Error loading user data. Check console.</p>';
        }
    }, 400); // Simulate slight delay
}

/** Handles account deletion for both Firebase and locally stored users */
async function deleteAccount() {
    // Check if a user is actually logged in according to the application state
    if (!currentUser || !currentUser.email) {
        alert("You must be logged in to delete your account.");
        return;
    }
    console.log(`Deletion requested for account: ${currentUser.email} (Firebase: ${!!currentUser.isFirebaseUser}, UID: ${currentUser.uid || 'N/A'})`);

    // Confirm with the user - this is a destructive action
    if (!confirm(`ARE YOU SURE you want to permanently delete your account (${currentUser.email})?\n\n!!! THIS ACTION CANNOT BE UNDONE !!!`)) {
        console.log("Account deletion cancelled by user prompt.");
        return; // Stop if user cancels confirmation
    }

    // --- Case 1: Deleting a Firebase Authenticated User ---
    if (currentUser.isFirebaseUser && currentUser.uid && auth) {
        console.log("Attempting to delete Firebase user...");
        const fbUser = auth.currentUser; // Get the currently signed-in user from Firebase SDK

        // Security Check: Ensure the Firebase SDK user matches our application state user
        if (fbUser && fbUser.uid === currentUser.uid) {
            try {
                displayStatus('authMessage', 'Deleting account...', 'loading'); // Show feedback
                // ** Call the Firebase SDK method to delete the user account **
                await fbUser.delete();
                console.log("Firebase user account deleted successfully through SDK.");

                // --- Post-Deletion Cleanup (Local Data) ---
                console.log("Cleaning up associated local data for deleted Firebase user...");
                // Remove supplemental data stored locally (ideally this is in a DB cleaned by backend trigger)
                localStorage.removeItem(`role_${currentUser.uid}`);
                localStorage.removeItem(`location_${currentUser.uid}`);
                localStorage.removeItem(`phone_${currentUser.uid}`);
                // Attempt to remove user from the local 'clickngoUsers' list as well
                try {
                     let users = JSON.parse(localStorage.getItem('clickngoUsers') || '[]');
                     users = users.filter(u => u.uid !== currentUser.uid); // Remove by UID
                     localStorage.setItem('clickngoUsers', JSON.stringify(users));
                     console.log("Removed user from 'clickngoUsers' list.");
                } catch (lsError){ console.warn("Could not clean user from clickngoUsers list:", lsError);}

                alert('Your account and associated application data have been deleted.');
                // Trigger logout flow to reset UI cleanly
                logoutFirebase(); // This handles clearing currentUser, LS session, and UI reset

            } catch (error) { // Handle errors during Firebase deletion
                console.error("Error deleting Firebase user account:", error);
                 displayStatus('authMessage', '', null); // Clear loading message
                // Check for common errors, especially needing recent login
                if (error.code === 'auth/requires-recent-login') {
                     alert("Deleting your account is a sensitive operation and requires you to have signed in recently.\n\nPlease sign in again with Google, then immediately try deleting your account again.");
                     // Optional: Trigger re-authentication? Less intuitive for deletion flow maybe.
                     // signInWithGoogleFirebase().then(() => deleteAccount()); // Could lead to loops if fails again
                } else {
                     alert(`An error occurred while deleting your account: ${error.message}\nPlease try again or contact support.`);
                }
                // Do not proceed with local cleanup if Firebase deletion failed
            }
             return; // Stop processing after Firebase attempt (success or fail)
        } else {
            // If Firebase state doesn't match app state, something is wrong. Prevent deletion.
             console.error("Account Deletion Halted: Mismatch between application user state and Firebase Auth state. Cannot securely delete.");
             alert("Authentication mismatch error. Cannot securely delete the account. Please log out fully and log back in, then try again.");
             return; // Stop
        }
    }

    // --- Case 2: Deleting an INSECURE Local Email/Password User ---
    else if (!currentUser.isFirebaseUser && currentUser.email) {
         console.warn(`Attempting deletion of INSECURE local user: ${currentUser.email}`);
         try {
             // Remove the user from the primary user list in localStorage
             let users = JSON.parse(localStorage.getItem('clickngoUsers') || '[]');
             const initialLength = users.length;
             // Filter out based on email AND the local user flag
             users = users.filter(user => !(user.email === currentUser.email && !user.isFirebaseUser));

             if (users.length < initialLength) {
                localStorage.setItem('clickngoUsers', JSON.stringify(users));
                console.log("Local user removed from 'clickngoUsers' list in localStorage.");
                alert('Local account data removed.');
                logoutFirebase(); // Use standard logout to clear state and reset UI
             } else {
                 // Should not happen if currentUser was set correctly, but handle defensively
                 console.warn("Local user to be deleted was not found in the localStorage list.");
                 alert('Could not find local user data to delete.');
                 logoutFirebase(); // Still log out
             }

         } catch (e) {
             console.error("Error deleting local account from localStorage:", e);
             alert("An error occurred while removing local account data.");
             logoutFirebase(); // Attempt logout anyway
         }
    }

    // --- Case 3: Inconsistent State (Shouldn't normally reach here) ---
    else {
        console.error("Cannot delete account: User state is invalid or inconsistent.", currentUser);
        alert("Cannot delete account due to an internal state error. Please refresh or contact support.");
    }
}


// --- Placeholders for user prompts (replace with modal/form UI) ---
function promptUserForRole(name) {
    console.warn("Using basic prompt for ROLE - Replace with better UI!");
    let role = prompt(`Welcome ${name || 'User'}! Select role: 'customer' or 'driver'?`, "customer");
    role = role?.trim().toLowerCase();
    return (role === 'customer' || role === 'driver' || role === 'admin') ? role : 'customer';
}
function promptUserForLocation() {
    console.warn("Using basic prompt for LOCATION - Replace with better UI!");
    return prompt("Enter main city/location:", "") || "Not Set";
}
function promptUserForPhone() {
    console.warn("Using basic prompt for PHONE - Replace with better UI!");
    let phone = prompt("Enter phone (optional):", "");
    // Add basic validation if desired, e.g., check if mostly digits
    return phone || "N/A";
}

// --- Feature Functions ---

/** Simulates placing an order, saves to localStorage */
function simulateOrder() {
     if (!currentUser) { alert("Please log in first."); return; }
     console.log(`Simulating order placement by: ${currentUser.email}`);
    try {
        let orders = JSON.parse(localStorage.getItem('orders') || '[]');
        const newOrder = {
            orderId: `CNG-${Date.now().toString().slice(-7)}`, // Unique enough ID for demo
            userEmail: currentUser.email,
            userId: currentUser.uid, // Link to Firebase UID if available
            date: new Date().toLocaleString(), // Record time of order
            items: "Simulated Item(s) via Button",
            status: "Pending", // Initial state
            location: currentUser.location // User's location when order placed
        };
        orders.push(newOrder); // Add to array
        localStorage.setItem('orders', JSON.stringify(orders)); // Save updated list

        alert('Demo Order Placed! Check history/tracking.');
        // Update UI immediately
        showOrderHistory();
        updateTracking(newOrder.orderId); // Start tracking simulation
        // Ensure the orders section is visible to see the tracking
        if(document.getElementById('orderItemsSection').style.display === 'none'){
            switchSection('orderItemsSection');
        }
    } catch (e) { console.error("simulateOrder Error:", e); alert("Error placing demo order."); }
}

/** Loads and displays order history from localStorage */
function showOrderHistory() {
    console.log("Displaying order history for:", currentUser?.email);
    const orderListEl = document.getElementById('orderList');
    if (!orderListEl) { console.error("Order history element (#orderList) missing."); return; }

    // Navigate to the section if not already there (helpful if called programmatically)
     if(document.getElementById('orderHistorySection').style.display === 'none'){
        switchSection('orderHistorySection');
     }

    orderListEl.innerHTML = '<div class="loading-message loading">Loading history...</div>'; // Show loading state

    setTimeout(() => { // Simulate fetch delay
        try {
            const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
             // Filter based on current user (allow Admin to see all)
             const userOrders = currentUser?.role === 'admin'
                 ? allOrders
                 : allOrders.filter(order => order.userEmail === currentUser?.email || (currentUser?.uid && order.userId === currentUser?.uid));

            console.log(`Found ${userOrders.length} orders for display.`);
            orderListEl.innerHTML = ''; // Clear loading

            if (userOrders.length === 0) {
                orderListEl.innerHTML = `<p>No order history found.</p>`;
            } else {
                // Sort newest first before displaying
                 userOrders.sort((a, b) => (new Date(b.date) || 0) - (new Date(a.date) || 0)); // Attempt date sort
                 userOrders.forEach(order => { // Display each order
                     const item = document.createElement('div');
                     item.classList.add('order-history-item');
                     const statusClass = `status-${(order.status || 'unknown').toLowerCase().replace(/\s+/g, '-')}`;
                     item.innerHTML = `
                         <h4>Order #${order.orderId || 'N/A'}</h4>
                         <p><strong>Date:</strong> ${order.date || 'N/A'}</p>
                         <p><strong>Details:</strong> ${order.items || 'N/A'}</p>
                         <p><strong>Status:</strong> <span class="${statusClass}">${order.status || 'Unknown'}</span></p>
                         ${currentUser?.role === 'admin' ? `<p><small>User: ${order.userEmail || order.userId || '?'}, Loc: ${order.location || '?'}</small></p>` : ''}
                         <hr style='border:0; border-top: 1px dashed #eee; margin-top: 8px;'>
                     `;
                     orderListEl.appendChild(item);
                 });
            }
        } catch (e) { console.error("Order history load/parse error:", e); orderListEl.innerHTML = `<p class="error-message">Could not load history.</p>`; }
    }, 300);
}

/** Simulates order tracking progress in the UI */
function updateTracking(orderId) {
    console.log(`Simulating tracking for order: ${orderId}`);
    const trackingPanel = document.getElementById('trackingPanel');
    if (!trackingPanel) { console.error("Tracking panel element missing."); return; }

    // Clear previous tracking interval if any
    if (window.currentTrackingInterval) {
        console.log("Clearing previous tracking interval.");
        clearInterval(window.currentTrackingInterval);
        window.currentTrackingInterval = null;
    }

    if (!orderId) { // Handle case where function called without an ID
        trackingPanel.innerHTML = `<p>Place an order or select from history to track.</p>`; return;
    }

    trackingPanel.innerHTML = `<div class="loading-message loading"> Searching for order ${orderId}...</div>`;

    setTimeout(() => { // Simulate finding order data
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        const order = orders.find(o => o.orderId === orderId);

        if (!order) { trackingPanel.innerHTML = `<p class="error-message">Order ${orderId} not found.</p>`; return; }

        // Prepare UI elements for tracking status
        trackingPanel.innerHTML = `<h4>Tracking Order: ${orderId}</h4><p id="trackingStatusDisplay">Status: Initializing...</p>`;
        const statusDisplay = document.getElementById('trackingStatusDisplay');
        if (!statusDisplay) return;

        const stages = ["Pending", "Driver Assigned", "Picking Up", "On the Way", "Delivered"];
        let currentStageIndex = stages.indexOf(order.status);
        if (currentStageIndex < 0) currentStageIndex = 0; // Default to first stage

        // Function to update the status display text and style
        const updateStatusDisplay = (stageIdx) => {
            const stageName = stages[stageIdx];
            const isLastStage = stageIdx >= stages.length - 1;
            const statusClass = `status-${stageName.toLowerCase().replace(/\s+/g, '-')}`;
            statusDisplay.innerHTML = `Status: <strong class="${statusClass}">${stageName}${isLastStage ? '' : '...'}</strong>`;
        };

        updateStatusDisplay(currentStageIndex); // Show current status immediately

        if (currentStageIndex >= stages.length - 1) { console.log("Tracking stopped: Order already delivered."); return; } // Stop if delivered

        // Set interval to simulate progress
        window.currentTrackingInterval = setInterval(() => {
            currentStageIndex++;
            updateStatusDisplay(currentStageIndex); // Update UI

            // Persist status update to localStorage (optional)
             try { let lsOrders=JSON.parse(localStorage.getItem('orders')||'[]'); let updatedLs=lsOrders.map(o=>(o.orderId===orderId?{...o, status: stages[currentStageIndex]}:o)); localStorage.setItem('orders', JSON.stringify(updatedLs)); } catch(e) {console.warn("LS update during tracking fail:",e)}

            if (currentStageIndex >= stages.length - 1) { // Check if delivered
                console.log(`Tracking simulation for ${orderId} reached final stage: Delivered.`);
                clearInterval(window.currentTrackingInterval); // Stop interval
                window.currentTrackingInterval = null;
                // Optionally show history again to reflect final status
                 if (document.getElementById('orderHistorySection')?.style.display === 'block') {
                     showOrderHistory();
                 }
            }
        }, 5000 + Math.random() * 5000); // Random delay 5-10 seconds per stage

    }, 600); // Short delay to "find" order
}

/** Adds user message to demo chat and simulates a reply */
function sendMessage() {
    const input = document.getElementById('chatInput');
    const messagesDiv = document.getElementById('chatMessages');
    if (!input || !messagesDiv) return; // Check if elements exist

    const messageText = input.value.trim();
    if (!messageText) return; // Ignore empty input

    console.log("Demo chat: Sending message:", messageText);
    // Display user's message
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'own');
    messageElement.textContent = messageText;
    messagesDiv.appendChild(messageElement);

    input.value = ''; // Clear input field
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll down

    // Simulate receiving a reply
    setTimeout(() => {
         console.log("Demo chat: Simulating reply...");
         const replyText = `Roger that! Your message: "${messageText.substring(0, 25)}${messageText.length > 25 ? '...' : ''}" was received.`;
         const replyElement = document.createElement('div');
         replyElement.classList.add('message', 'incoming');
         replyElement.textContent = replyText;
         messagesDiv.appendChild(replyElement);
         messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 1500 + Math.random() * 1500); // Random delay for reply
}

/** Handles submission of the feedback form */
function submitFeedback(event) {
    event.preventDefault();
    if (!currentUser) { alert("Please log in first."); return; }
    const messageInput = document.getElementById('feedbackMessage');
    const statusEl = document.getElementById('feedbackStatus');
    if (!messageInput || !statusEl) return;
    const message = messageInput.value.trim();
    if (!message) { displayStatus('feedbackStatus', 'Message cannot be empty.', 'error'); return; }

    console.log(`Submitting feedback from ${currentUser.email}`);
    displayStatus('feedbackStatus', 'Sending...', 'loading');

    setTimeout(() => { // Simulate saving feedback
        try {
            const feedbacks = JSON.parse(localStorage.getItem('feedbackMessages') || '[]');
            feedbacks.push({ userEmail: currentUser.email, userId: currentUser.uid, message, timestamp: new Date().toISOString() });
            localStorage.setItem('feedbackMessages', JSON.stringify(feedbacks));
            console.log("Feedback saved to localStorage.");
            displayStatus('feedbackStatus', 'Feedback Sent! Thanks.', 'success');
            messageInput.value = ''; // Clear form
            notifyUser("We received your feedback!"); // Browser notification
            setTimeout(() => displayStatus('feedbackStatus', '', null), 4000); // Clear success msg
        } catch (e) { console.error("Feedback save error:", e); displayStatus('feedbackStatus', 'Error saving feedback.', 'error'); }
    }, 1200);
}

// --- Settings & Preferences ---

/** Loads theme and language preferences from localStorage */
function loadPreferences() {
    console.log("Loading preferences...");
    try {
        const prefs = JSON.parse(localStorage.getItem('userPreferences') || '{}');
        // Apply Language
        const langSelect = document.getElementById('languageSelect');
        if (langSelect && prefs.language) langSelect.value = prefs.language; // Update dropdown
        // Apply Theme
        const theme = prefs.theme || 'light';
        const darkModeToggle = document.getElementById('darkModeToggle');
        document.body.classList.toggle('dark-mode', theme === 'dark'); // Set body class
        if (darkModeToggle) darkModeToggle.checked = (theme === 'dark'); // Update checkbox
        console.log("Preferences applied:", prefs);
    } catch (e) { console.error("Failed to load preferences:", e); }
}

/** Saves theme and language preferences to localStorage */
function savePreferences() {
    const statusEl = document.getElementById('userPreferencesStatus');
    console.log("Saving preferences...");
    if(statusEl) displayStatus('userPreferencesStatus', 'Saving...', 'loading');

    setTimeout(() => { // Simulate save
         try {
            const prefs = {
                language: document.getElementById('languageSelect')?.value || 'en',
                theme: document.getElementById('darkModeToggle')?.checked ? 'dark' : 'light'
            };
            localStorage.setItem('userPreferences', JSON.stringify(prefs));
            console.log("Preferences Saved:", prefs);
            if(statusEl) displayStatus('userPreferencesStatus', 'Preferences Saved!', 'success');
            setTimeout(() => displayStatus('userPreferencesStatus', '', null), 2500); // Clear msg
         } catch (e) { console.error("Failed to save preferences:", e); if(statusEl) displayStatus('userPreferencesStatus','Error saving.','error');}
    }, 400);
}

/** Toggles dark mode UI and saves the preference */
function toggleDarkMode() {
    const isNowDark = document.body.classList.toggle('dark-mode');
    console.log(`Dark Mode toggled ${isNowDark ? 'ON' : 'OFF'}.`);
    const checkbox = document.getElementById('darkModeToggle');
    if (checkbox) checkbox.checked = isNowDark; // Sync checkbox state
    savePreferences(); // Persist the change
}

// --- Utility Functions ---

/** Loads FAQ content into the #faqList element */
function loadFaq() {
    console.log("Loading FAQ content...");
    const listEl = document.getElementById('faqList');
    if (!listEl) { console.error("FAQ list element '#faqList' not found!"); return; }
    listEl.innerHTML = ''; // Clear placeholder/old content

    const faqItems = [ // Central place for FAQ data
        { q: "What services are offered?", a: "We provide 12-hour motor-taxi (habal-habal) and delivery (pabili/padala) services within our operating area." },
        { q: "How do I book a service?", a: "Currently, all bookings are done through direct message on our official Facebook page. The link is available in the 'Orders' section." },
        { q: "How can I contact support?", a: "Reach out via email at clickngoservice@gmail.com, text/call 0916 554 0988, or message our Facebook page." },
        { q: "What are the service hours?", a: "We generally operate for 12 hours each day. Please refer to our Facebook page for the most current specific operating times." },
        { q: "How much does it cost?", a: "Pricing varies based on the type of service (ride vs. delivery) and the distance involved. Please ask for a quote when you book via Facebook message." }
    ];

    if (faqItems.length === 0) { listEl.innerHTML = '<p>No FAQs available at the moment.</p>'; return; }

    faqItems.forEach(faq => {
        const item = document.createElement('div');
        item.classList.add('faq-item'); // Apply styling class
        // Create elements and set textContent safely
        const questionP = document.createElement('p');
        questionP.classList.add('faq-question');
        questionP.innerHTML = '<strong>Q:</strong> '; // Use innerHTML only for static tags
        questionP.appendChild(document.createTextNode(faq.q));

        const answerP = document.createElement('p');
        answerP.classList.add('faq-answer');
        answerP.innerHTML = '<strong>A:</strong> ';
        answerP.appendChild(document.createTextNode(faq.a));

        item.appendChild(questionP);
        item.appendChild(answerP);
        listEl.appendChild(item); // Add the completed FAQ item to the list
    });
    console.log(`Loaded ${faqItems.length} FAQ items.`);
}

/** Safely set element text content */
function setText(id, text, defaultTxt = "N/A") { const el=document.getElementById(id); if(el) el.textContent = text || defaultTxt; }
/** Safely set element innerHTML */
function setTextHTML(id, html, defaultHtml = "") { const el=document.getElementById(id); if(el) el.innerHTML = html || defaultHtml; }
/** Update clock display */
function updateClock() { const el=document.getElementById('clockDisplay'); if(el)el.innerText=new Date().toLocaleTimeString([],{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});}
/** Display greeting based on time */
function displayWelcomeMessage() { const el=document.getElementById('welcomeMessage'); if(!el)return; const h=new Date().getHours();let m="evening";if(h<5)m="night";else if(h<12)m="morning";else if(h<18)m="afternoon"; el.innerText=`Good ${m}!`; }
/** Clear input field and associated error */
function clearInput(id) { const el=document.getElementById(id); if(el)el.value=''; displayError(id+'Error',''); }
/** Basic email validation */
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email||'').toLowerCase()); }
/** Basic phone number validation */
function isValidPhoneNumber(phone) { const c=String(phone||'').replace(/\D/g, ''); return /^\+?\d{7,15}$/.test(c); } // Allow 7-15 digits, optional +
/** Trigger browser notification */
function notifyUser(msg) { if(!('Notification'in window))return; Notification.requestPermission().then(p=>{if(p==='granted')new Notification('Click n Go!',{body:msg})}); }
/** Display status messages with styling */
function displayStatus(id, msg, type=null) { const el=document.getElementById(id); if(!el)return; el.innerText=msg||''; el.className='status-message'; if(type==='loading')el.classList.add('loading-message','loading'); else if(type==='success')el.classList.add('success'); else if(type==='error')el.classList.add('error-message'); }
/** Display error messages */
function displayError(id, msg) { const el=document.getElementById(id); if(el){el.innerText=msg||'';el.classList.add('error-message');}}
/** Clear common error/status fields */
function clearAllErrors() { ['signUpEmailError','signUpPasswordError','signUpLocationError','signUpPhoneError','signUpRoleError','loginError','loginEmailError','loginPasswordError','otpError'].forEach(id=>displayError(id,'')); ['otpStatus','feedbackStatus','userPreferencesStatus','authMessage'].forEach(id=>displayStatus(id,'',null)); console.log("Cleared common errors/statuses."); }
/** Reset forms, clear errors, show login view */
function resetApp() { console.log("Resetting application UI and state..."); document.getElementById('signupFormElem')?.reset(); document.getElementById('loginFormElem')?.reset(); clearAllErrors(); resetToAuthState();}

// *** END of script.js ***
