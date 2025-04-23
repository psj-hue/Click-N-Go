// -------------------------------------
// --- Firebase Initialization ---
// -------------------------------------
// # NOTE: Ensure HTML uses <script type="module" src="script.js">

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    deleteUser // # NOTE: Added deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getDatabase,
    ref,
    push,
    set,
    onValue,
    off, // # NOTE: Added off
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ---=== YOUR FIREBASE CONFIGURATION ===---
// # NOTE: Replace with your actual config, ideally from a config file or environment variables
const firebaseConfig = {
    apiKey: "AIzaSyDB5HOMSqUgpO9Dy3GhI9-vhemmr9sATmg", // Replace if needed
    authDomain: "click-n--go.firebaseapp.com",
    databaseURL: "https://click-n--go-default-rtdb.firebaseio.com", // Crucial for RTDB
    projectId: "click-n--go",
    storageBucket: "click-n--go.appspot.com",
    messagingSenderId: "697356789668",
    appId: "1:697356789668:web:33eab0fc45e56274ef8331",
    measurementId: "G-G95S72XP35"
};
// -------------------------------------------

// # NOTE: Firebase Globals
let app;
let analytics = null; // Initialize as null
let auth;
let googleProvider;
let db; // Database instance
let chatMessagesRef; // Reference to chat messages location
let chatListenerUnsubscribe = null; // To hold the listener detach function

try {
    app = initializeApp(firebaseConfig);

    // Conditionally initialize Analytics only if supported by the browser
    isAnalyticsSupported().then(supported => {
        if (supported && firebaseConfig.measurementId && firebaseConfig.measurementId.startsWith('G-')) {
            analytics = getAnalytics(app);
            console.log("Firebase Analytics Initialized.");
        } else {
            console.warn("Firebase Analytics not initialized: Not supported or measurementId missing/invalid.");
        }
    });

    auth = getAuth(app);
    db = getDatabase(app);
    chatMessagesRef = ref(db, 'chats/mainRoom'); // Define chat reference path
    googleProvider = new GoogleAuthProvider();
    console.log("Firebase Core Services (Auth, RTDB) Initialized Successfully.");
} catch (error) {
    console.error("FATAL: Firebase Initialization Failed:", error);
    alert("Critical Error: Could not initialize required services.");
    document.body.innerHTML = `<div style='padding: 30px; text-align: center; color: red;'><h2>Initialization Error</h2><p>Could not connect to critical services. Please check the console log or contact support.</p></div>`;
    throw new Error("Firebase Initialization Failed - Application cannot continue.");
}

// --- ============================================= --- //
// --- !!! VERY IMPORTANT SECURITY WARNINGS !!! --- //
// --- ============================================= --- //
// 1. INSECURE LOCAL AUTH: The Email/Password Sign Up & Login functionality
//    below stores user passwords directly in the browser's Local Storage.
//    This is EXTREMELY INSECURE and makes user accounts vulnerable.
//    **DO NOT USE THIS SYSTEM IN A REAL-WORLD APPLICATION.**
//    It is kept here *only* as a demonstration based on the original code.
//    Always use Firebase Authentication methods (Google Sign-In, Email/Password Auth)
//    which handle security properly.
//
// 2. FIREBASE SECURITY RULES: Your Firebase Realtime Database and Authentication
//    NEED Security Rules configured in the Firebase Console (Database > Rules, Authentication > Settings).
//    Without rules, your database is likely open to anyone to read/write/delete data.
//    **SET UP SECURITY RULES IMMEDIATELY.** Example (restrict write to logged-in users):
//    { "rules": { "chats": { ".read": "auth != null", ".write": "auth != null" },
//                 "users": { "$uid": { ".read": "auth != null", ".write": "$uid === auth.uid" }} } }
//
// 3. USER PROFILE DATA: Storing role, location, phone in Local Storage tied to UID is
//    also insecure and easily manipulated. This data *should* be stored securely
//    in Firebase (Realtime Database or Firestore) and protected by Security Rules.
// ----------------------------------------------------- //

// --- Global Variables ---
let currentUser = null;

// --- Initialization & Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    if (!auth || !db) {
        console.error("Firebase Auth or Database instance is not available. App may be broken.");
        return;
    }
    initializeAuthenticationState();
    attachAllEventListeners(); // # NOTE: Use the consolidated function
    loadStaticData();
    startTimers();
});

function initializeAuthenticationState() {
    const storedUser = localStorage.getItem('clickngoUser');
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            console.log("Restored user session from localStorage:", currentUser?.email);
            // # NOTE: Delay UI update slightly to ensure styles/DOM ready
            setTimeout(() => updateUIForSignedInUser(currentUser), 100);
        } catch (e) {
            console.error("Error parsing stored user data:", e);
            localStorage.removeItem('clickngoUser');
            resetToAuthState();
        }
    } else {
        console.log("No user in localStorage. Displaying auth page.");
        resetToAuthState();
    }

    // Listen for actual Firebase Auth state changes
    onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
            // # NOTE: User is signed in according to Firebase. Check if local state matches.
            if (!currentUser || currentUser.uid !== firebaseUser.uid || !currentUser.isFirebaseUser) {
                 console.log("Firebase auth state change detected (User Signed In):", firebaseUser.email);
                 // # NOTE: If the current user is the insecure local user, or doesn't match,
                 // # NOTE: trigger a fetch/prompt (like the Google Sign-in flow) to sync.
                 // # NOTE: Or simply let the Google sign-in button handle re-authentication if needed.
                 // # NOTE: For this version, we rely on explicit button clicks for login flow consistency.
                 if(currentUser && currentUser.isFirebaseUser && currentUser.uid === firebaseUser.uid){
                      console.log("Firebase onAuthStateChanged confirms current user is valid.");
                 } else if (currentUser && !currentUser.isFirebaseUser) {
                     console.warn("Firebase signed in, but local user is insecure type. Consider forcing secure login.");
                 } else {
                      console.warn("Firebase signed in, but local state mismatch or absent. User needs to login via button.");
                      // # NOTE: Optionally force logout/reset UI if a mismatch is critical
                      // logoutFirebase();
                 }
            }
        } else {
            // # NOTE: User is signed out according to Firebase.
            if (currentUser) {
                console.warn("Firebase auth state changed to signed out, but local state has a user. Forcing local cleanup.");
                handleLogout(); // # NOTE: Use the core logout logic
            }
        }
    });
}


function attachAllEventListeners() {
    console.log("Attaching event listeners...");

    // --- Authentication ---
    document.getElementById('loginFormElem')?.addEventListener('submit', handleLocalLogin);
    document.getElementById('signupFormElem')?.addEventListener('submit', handleLocalSignUp);
    document.getElementById('switchToLoginLink')?.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });
    document.getElementById('switchToSignUpLink')?.addEventListener('click', (e) => { e.preventDefault(); showSignUpForm(); });
    document.getElementById('googleSignInButton')?.addEventListener('click', signInWithGoogleFirebase);
    document.getElementById('logoutButton')?.addEventListener('click', logoutFirebase); // Use the Firebase specific logout
    document.getElementById('verifyOtpButton')?.addEventListener('click', handleLocalOtpVerify); // # NOTE: Insecure OTP

    // --- Main App Navigation ---
    document.getElementById('bottomNav')?.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-section]');
        if (button) {
            switchSection(button.dataset.section);
        }
    });
     document.getElementById('appContent')?.addEventListener('click', (event) => {
         const button = event.target.closest('button[data-section]');
         if (button) {
              switchSection(button.dataset.section);
         }
         // # NOTE: Handle back buttons inside sections
         if (event.target.classList.contains('back-button')) {
              const targetSection = event.target.dataset.section;
              if (targetSection) {
                    switchSection(targetSection);
              }
         }
     });

    // --- Input Clearing ---
    document.querySelectorAll('.clear-input').forEach(span => {
        span.addEventListener('click', () => {
            const targetId = span.dataset.clearTarget;
            const input = document.getElementById(targetId);
            if (input) {
                input.value = '';
                input.focus();
                // # NOTE: Optionally trigger validation or clear error message
                 const errorElement = document.getElementById(targetId + 'Error');
                 if (errorElement) displayError(errorElement, '');
            }
        });
    });

     // --- Home Quick Actions & History ---
     document.getElementById('showHistoryButton')?.addEventListener('click', showOrderHistory);


    // --- Order/Service Section ---
    document.getElementById('simulateOrderButton')?.addEventListener('click', simulateOrder);
    document.getElementById('chatForm')?.addEventListener('submit', (e) => {
         e.preventDefault();
         sendMessage();
    });
    // # NOTE: No direct 'chatSendButton' listener needed if using form submit


    // --- Account & Admin ---
    document.getElementById('deleteAccountButton')?.addEventListener('click', deleteAccount);

    // --- Settings & Preferences ---
    document.getElementById('darkModeToggle')?.addEventListener('change', toggleDarkMode);
    document.getElementById('savePreferencesButton')?.addEventListener('click', savePreferences);

    // --- About/Feedback ---
    document.getElementById('feedbackForm')?.addEventListener('submit', submitFeedback);

     // --- Input Validation Feedback (Simple Example) ---
     document.querySelectorAll('#authSection input[required], #otpPage input[required]').forEach(input => {
        input.addEventListener('input', () => validateInput(input));
        input.addEventListener('blur', () => validateInput(input)); // Validate on blur too
     });

     // --- Input Focus Clear Button Visibility (Better handled with CSS :placeholder-shown) ---
     // --- Replaced with pure CSS approach in style.css ---
     /*
     document.querySelectorAll('.form-group input').forEach(input => {
        const clearBtn = input.parentElement.querySelector('.clear-input');
        if (clearBtn) {
            const toggleClear = () => {
                clearBtn.style.opacity = input.value ? '0.7' : '0';
                clearBtn.style.pointerEvents = input.value ? 'auto' : 'none';
            };
            input.addEventListener('input', toggleClear);
            input.addEventListener('focus', toggleClear); // Show on focus too
            input.addEventListener('blur', () => { // Hide slightly delayed on blur if empty
                if (!input.value) {
                   setTimeout(() => { clearBtn.style.opacity = '0'; clearBtn.style.pointerEvents = 'none'; }, 150);
                }
            });
            toggleClear(); // Initial check
        }
    });
    */
}

function loadStaticData() {
    console.log("Loading static data (FAQ, Preferences)...");
    loadFaq();
    loadPreferences();
}

function startTimers() {
    console.log("Starting timers (Clock)...");
    updateClock(); // Initial call
    displayWelcomeMessage();
    setInterval(updateClock, 1000); // Update time every second
    // # NOTE: Optionally refresh date less frequently if needed
}

// --- UI Management Functions ---

function updateUIForSignedInUser(user) {
    if (!user || !user.email) {
        console.warn("updateUIForSignedInUser called with invalid user.", user);
        resetApp(); // Full reset if user data is corrupt
        return;
    }
    console.log(`Updating UI for signed-in user: ${user.email} (Role: ${user.role})`);
    toggleVisibility('authSection', null);
    toggleVisibility('otpPage', null);
    toggleVisibility('appSection', 'block'); // Use 'block' or 'flex' depending on container type

    populateAccountInfo(user);
    displayDashboard(user.role); // Setup panels based on role
    updateMap(); // Update map placeholders
    loadPreferences(); // Load theme, etc.

    // # NOTE: Go to home screen after login
    switchSection('homeSection');
}

function resetToAuthState() {
    console.log("Resetting UI to authentication state.");
    detachChatListener(); // # NOTE: Ensure chat listener is off
    toggleVisibility('appSection', null);
    toggleVisibility('otpPage', null);
    toggleVisibility('authSection', 'block'); // Or flex
    showLoginForm(); // Default to login form
    clearAllErrors();
}

function toggleVisibility(elementId, displayValue = null) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = displayValue === null ? 'none' : displayValue;
    } else {
        console.warn(`Element to toggle not found: #${elementId}`);
    }
}

function switchSection(sectionId) {
    console.log(`Navigating to section: #${sectionId}`);
    const appContent = document.getElementById('appContent');
    if (!appContent) return;

    let targetSectionFound = false;

    // # NOTE: Detach chat listener if moving *away* from the section containing chat
    const currentActiveChatSection = document.querySelector('.content-section.active-section #chatSection');
    if (currentActiveChatSection && sectionId !== currentActiveChatSection.closest('.content-section').id) {
         if (chatListenerUnsubscribe) {
            console.log("Detaching chat listener because we are leaving the chat section.");
            detachChatListener();
        }
    }


    // # NOTE: Hide all content sections using a class for potential transitions
    appContent.querySelectorAll('.content-section').forEach(sec => {
         sec.classList.remove('active-section');
         // # NOTE: Optionally reset display immediately or let CSS handle it
         sec.style.display = 'none';
         sec.style.opacity = '0'; // Reset for animation
    });

     // # NOTE: Special handling for Admin panel (nested)
     const adminPanel = document.getElementById('adminSection');
     if (adminPanel) {
         adminPanel.style.display = 'none'; // Hide by default
     }

    // # NOTE: Show the target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        // # NOTE: Delay adding class slightly allows CSS transition to work better
        setTimeout(() => {
            targetSection.classList.add('active-section');
            // # NOTE: Trigger reflow for animation - already handled by CSS animation keyframes
        }, 10); // Small delay
        targetSectionFound = true;

         // # NOTE: Load Admin users if navigating *to* Account and user is Admin
         if (sectionId === 'accountSection' && currentUser?.role === 'admin' && adminPanel) {
            adminPanel.style.display = 'block';
            loadAllUsers();
         }

    } else {
        console.error(`Target section "#${sectionId}" not found! Defaulting to home.`);
        const homeSection = document.getElementById('homeSection');
        if (homeSection) {
            homeSection.style.display = 'block';
            setTimeout(() => homeSection.classList.add('active-section'), 10);
        }
        sectionId = 'homeSection'; // Fallback for nav highlighting
    }

    // # NOTE: Update map if relevant section is active
    if (sectionId === 'orderItemsSection' || sectionId === 'homeSection') {
        updateMap();
    }

    // # NOTE: Update bottom nav active state
    const bottomNav = document.getElementById('bottomNav');
    bottomNav?.querySelectorAll('button').forEach(button => {
        button.classList.remove('active');
        if (button.dataset.section === sectionId) {
            button.classList.add('active');
        }
    });

    // # NOTE: Setup chat listener if the new section *contains* the chat element
     if (targetSection && targetSection.querySelector('#chatSection')) {
          console.log(`Current section (#${sectionId}) includes chat, ensuring listener is set up.`);
          // # NOTE: setupChatListener has checks to prevent duplicates
          setupChatListener();
     }

    // # NOTE: Scroll to top of content area on section switch
    appContent.scrollTop = 0; // For the container if it scrolls
    window.scrollTo(0, 0); // Scroll window itself
}

function showLoginForm() {
     toggleAuthForms('loginForm');
     document.getElementById('loginEmail')?.focus();
}
function showSignUpForm() {
     toggleAuthForms('signUpForm');
     document.getElementById('signUpEmail')?.focus();
}
function toggleAuthForms(formIdToShow) {
    console.log(`Toggling auth form: ${formIdToShow}`);
    document.getElementById('signUpForm').style.display = (formIdToShow === 'signUpForm' ? 'block' : 'none');
    document.getElementById('loginForm').style.display = (formIdToShow === 'loginForm' ? 'block' : 'none');
    clearAllErrors(); // Clear errors when switching forms
    displayStatus('authMessage', '', null); // Clear general status message
}


function displayDashboard(role) {
    // # NOTE: Manages visibility of role-specific panels within the 'orderItemsSection'
    const orderPanel = document.getElementById('orderPanel'); // Customer
    const requestPanel = document.getElementById('orderRequestPanel'); // Driver
    const isAdmin = role === 'admin';
    const isCustomer = role === 'customer';
    const isDriver = role === 'driver';

    // # NOTE: Admin can see customer panel, maybe driver panel too? Adjust logic as needed.
    if (orderPanel) orderPanel.style.display = (isCustomer || isAdmin) ? 'block' : 'none';
    if (requestPanel) requestPanel.style.display = (isDriver || isAdmin) ? 'block' : 'none';

     // # NOTE: Potentially load driver-specific data if applicable when showing requestPanel
     if (requestPanel && requestPanel.style.display === 'block') {
         // loadDriverRequests(); // Example placeholder
         console.log("Driver panel visible - # NOTE: Add logic to load requests if needed.");
     }
}

function updateMap() {
    // # NOTE: Updates placeholder text. Real implementation needs map library (Leaflet, Google Maps)
    const location = currentUser?.location || 'Location Not Set';
    setText('userLocationDisplay', location);
    setText('userLocationDisplayHome', location);
    const mapText = `(Simulated map centered near <strong>${location || '?'}</strong>)`;
    const mapErrorText = `(Map Area - Integration Required)`;
    setTextHTML('mapPlaceholder', location ? mapText : mapErrorText);
    setTextHTML('mapPlaceholderSmall', location ? mapText : mapErrorText);
}

function populateAccountInfo(user) {
     if (!user) return;
     setText('accountEmail', user.email);
     setText('accountName', user.displayName || '(Not Set)');
     setText('accountLocation', user.location || 'N/A');
     setText('accountPhone', user.phone || 'N/A');
     setText('userRole', user.role || 'N/A');
     setText('accountUid', user.uid || 'N/A (Local/Demo)');
     setText('userEmailDisplay', user.displayName || user.email); // For home screen welcome
}

// --- Authentication Functions ---

function signInWithGoogleFirebase() {
    if (!auth || !googleProvider || !db) {
        console.error("Firebase services not ready for Google Sign-In.");
        displayStatus('authMessage', 'Secure sign-in service unavailable.', 'error');
        return;
    }
    console.log("Initiating Secure Google Sign-In via Firebase...");
    displayStatus('authMessage', 'Opening Google Sign-In...', 'loading');

    signInWithPopup(auth, googleProvider)
      .then((result) => {
        const firebaseUser = result.user;
        console.log("Firebase Google Sign-In SUCCESS:", { email: firebaseUser.email, uid: firebaseUser.uid });
        displayStatus('authMessage', `Signed in as ${firebaseUser.email}. Preparing your session...`, 'success');

        // # NOTE: Structure user data consistently
        const uid = firebaseUser.uid;
        const email = firebaseUser.email;
        const displayName = firebaseUser.displayName || email.split('@')[0]; // Sensible default name

        // --- === CRITICAL: Supplemental Data Handling === ---
        // # NOTE: In a *real* app, you would FETCH this data from Firestore/RTDB
        // # NOTE: using the `uid` AFTER successful sign-in.
        // # NOTE: The prompt/localStorage below is for DEMO ONLY and is INSECURE/UNRELIABLE.
        // # NOTE: Example fetching (pseudo-code):
        // # NOTE: const userProfile = await getUserProfileFromDB(uid);
        // # NOTE: if (!userProfile) { /* Guide user through profile setup */ }
        console.log(`Fetching supplemental data for UID: ${uid} (Demo: Using LocalStorage/Prompt - NOT FOR PRODUCTION)`);
        let role = localStorage.getItem(`role_${uid}`);
        let location = localStorage.getItem(`location_${uid}`);
        let phone = localStorage.getItem(`phone_${uid}`);

        // # NOTE: Prompt only if data is missing (still bad practice, use a proper UI form)
        if (!role) role = promptUserForRole(displayName);
        if (!location) location = promptUserForLocation();
        if (!phone) phone = promptUserForPhone();
        // -----------------------------------------------------

        currentUser = {
          email, uid, displayName, photoURL: firebaseUser.photoURL,
          role, location, phone,
          isFirebaseUser: true // # NOTE: Flag this as a secure Firebase user
        };

         // # NOTE: Persist supplemental info (to LS for demo - should be secure DB write)
         localStorage.setItem(`role_${uid}`, currentUser.role);
         localStorage.setItem(`location_${uid}`, currentUser.location);
         localStorage.setItem(`phone_${uid}`, currentUser.phone);

         // # NOTE: Persist main session object locally
         localStorage.setItem('clickngoUser', JSON.stringify(currentUser));

         // # NOTE: Save/Update user profile info in Firebase DB (Example for RTDB)
         // # NOTE: Ensure Security Rules allow this write! ({ "rules": { "users": { "$uid": { ".write": "$uid === auth.uid" } } } })
         const userProfileRef = ref(db, `users/${uid}`);
         const profileData = {
             email: currentUser.email,
             displayName: currentUser.displayName,
             role: currentUser.role,
             location: currentUser.location,
             phone: currentUser.phone,
             lastLogin: serverTimestamp(), // Use Firebase server time
             photoURL: currentUser.photoURL || null // Store photo URL
         };
         set(userProfileRef, profileData)
             .then(() => console.log("User profile saved/updated in Firebase RTDB."))
             .catch(err => console.error("Error saving user profile to RTDB:", err)); // # NOTE: Handle DB write errors

        // # NOTE: Update UI after a short delay to allow processes to finish
        setTimeout(() => {
             updateUIForSignedInUser(currentUser);
             displayStatus('authMessage', '', null); // Clear auth message
        }, 700);

      })
      .catch((error) => {
        console.error("Firebase Google Sign-In Error:", error);
        let userMessage = `Google Sign-In Error: ${error.message}`;
        if (error.code === 'auth/popup-closed-by-user') userMessage = 'Sign-in cancelled by user.';
        if (error.code === 'auth/account-exists-with-different-credential') userMessage = 'An account already exists with this email using a different sign-in method.';
        if (error.code === 'auth/unauthorized-domain') userMessage = 'This website is not authorized for Google Sign-In (check Firebase console).';
        if (error.code === 'auth/popup-blocked') userMessage = 'Sign-in popup blocked by browser. Please allow popups for this site.';
        if (error.code === 'auth/cancelled-popup-request') userMessage = 'Multiple sign-in attempts made. Please try again.';

        displayStatus('authMessage', userMessage, 'error');
      });
}

// # NOTE: Wrapper for the main logout logic
function logoutFirebase() {
    if (!auth) { console.error("Firebase Auth not ready for logout."); return; }

    const userEmailForLog = currentUser?.email;
    console.log(`Attempting Firebase Sign Out for user: ${userEmailForLog || '(unknown)'}`);

    // # NOTE: Always detach listener first during logout process
    detachChatListener();

    signOut(auth).then(() => {
        console.log("Firebase Sign Out successful.");
        handleLogout(); // # NOTE: Call the shared cleanup logic
        displayStatus('authMessage', 'You have been successfully logged out.', 'success');
        setTimeout(() => displayStatus('authMessage', '', null), 3500); // Clear message after a while

    }).catch((error) => {
        console.error("Firebase Sign Out Error:", error);
        // # NOTE: Attempt local cleanup even if Firebase signout fails network-wise
        handleLogout();
        alert(`Error during sign out: ${error.message}. You have been logged out locally.`);
    });
}

// # NOTE: Centralized local cleanup logic
function handleLogout() {
    console.log("Executing local logout cleanup.");
    const wasAdmin = currentUser?.role === 'admin'; // Check before clearing
    currentUser = null;
    localStorage.removeItem('clickngoUser');
    // # NOTE: Keep supplemental LS data (role_uid etc.) for potential re-login? Or clear it?
    // # NOTE: Clearing it forces prompts again on next login if DB fetch isn't implemented.
    // localStorage.removeItem(`role_${uid}`); // Example if clearing is desired

    resetApp(); // Handles UI reset

    // # NOTE: Hide admin panel explicitly if it was visible
     if (wasAdmin) {
         const adminPanel = document.getElementById('adminSection');
         if (adminPanel) adminPanel.style.display = 'none';
     }
}


// --- ============================================= --- //
// --- !!! INSECURE LOCAL AUTH DEMO FUNCTIONS !!! --- //
// ---       ( DO NOT USE IN PRODUCTION )         --- //
// --- ============================================= --- //
function handleLocalSignUp(event) {
    event.preventDefault();
    console.warn("--- INSECURE LOCAL SIGNUP PROCESS INITIATED ---");
    clearAllErrors(); // Clear previous validation errors

    // # NOTE: Get form values
    const emailInput = document.getElementById('signUpEmail');
    const passwordInput = document.getElementById('signUpPassword');
    const locationInput = document.getElementById('signUpLocation');
    const phoneInput = document.getElementById('signUpPhone');
    const roleSelect = document.getElementById('signUpRole');

    // # NOTE: Perform validation
    let isValid = true;
    if (!validateInput(emailInput, { isEmail: true })) isValid = false;
    if (!validateInput(passwordInput, { minLength: 6 })) isValid = false;
    if (!validateInput(locationInput)) isValid = false;
    if (!validateInput(phoneInput, { isPhone: true })) isValid = false;
    if (!validateInput(roleSelect)) isValid = false;

    if (!isValid) {
        displayStatus('authMessage', 'Please fix the errors in the form.', 'error');
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim(); // # NOTE: !!! STORING RAW PASSWORD !!!
    const location = locationInput.value.trim();
    const phone = phoneInput.value.trim();
    const role = roleSelect.value;

    // # NOTE: Check if local email already exists (still insecure check)
    try {
        const localUsers = JSON.parse(localStorage.getItem('clickngoUsers') || '[]');
        if (localUsers.some(user => user.email === email)) {
            displayError(document.getElementById('signUpEmailError'), 'This email is already registered locally (insecurely).');
            emailInput.classList.add('error');
            isValid = false;
        }
    } catch (err) {
        console.error("Error reading local user store:", err);
        displayStatus('authMessage', 'An error occurred checking user data. Please try again.', 'error');
        return;
    }

    if (!isValid) return;


    // # NOTE: Proceed with INSECURE OTP flow
    const otp = generateOTP(); // # NOTE: Still using insecure OTP generation
    // # NOTE: Temporarily store data + OTP for verification (Session Storage is slightly better than Local but still bad)
    sessionStorage.setItem('signUpData', JSON.stringify({ email, password, location, phone, role, otp }));

    // # NOTE: Display OTP page - !!! IMPORTANT: Log OTP to console FOR DEMO ONLY !!!
    setText('otpMessage', `Enter the 6-digit code for ${email}.`);
    console.warn(`********************************************************`);
    console.warn(`* INSECURE LOCAL SIGNUP - DEMO OTP for ${email}: ${otp} *`);
    console.warn(`* (This would normally be sent via a secure channel) *`);
    console.warn(`********************************************************`);

    toggleVisibility('authSection', null);
    toggleVisibility('otpPage', 'block');
    document.getElementById('otpInput')?.focus();
}

function generateOTP() {
    // # NOTE: Simple insecure OTP generator for demo purposes.
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function handleLocalOtpVerify() {
    console.warn("--- INSECURE LOCAL OTP VERIFICATION ---");
    clearAllErrors(['otpError', 'otpStatus']); // Clear only OTP related errors
    const otpInput = document.getElementById('otpInput');
    const enteredOtp = otpInput?.value.trim();
    const otpErrorEl = document.getElementById('otpError');

    if (!validateInput(otpInput, { exactLength: 6, isNumeric: true })) {
        displayStatus('otpStatus', '', null);
        return; // Validation handles error display
    }

    // # NOTE: Retrieve stored sign-up data (from insecure Session Storage)
    const storedDataString = sessionStorage.getItem('signUpData');
    if (!storedDataString) {
        displayError(otpErrorEl, "Verification session expired or data missing. Please sign up again.");
        displayStatus('otpStatus', '', null);
        setTimeout(resetToAuthState, 3000); // Go back to auth after showing error
        return;
    }

    let signUpData;
    try {
        signUpData = JSON.parse(storedDataString);
    } catch (e) {
        displayError(otpErrorEl, "Verification data corrupted. Please sign up again.");
        displayStatus('otpStatus', '', null);
        sessionStorage.removeItem('signUpData');
        setTimeout(resetToAuthState, 3000);
        return;
    }

    // # NOTE: Validate the retrieved data structure
    if (!signUpData || !signUpData.otp || !signUpData.email || !signUpData.password || !signUpData.role) {
        displayError(otpErrorEl, "Incomplete verification data. Please sign up again.");
        displayStatus('otpStatus', '', null);
        sessionStorage.removeItem('signUpData');
        setTimeout(resetToAuthState, 3000);
        return;
    }

    // --- === THE ACTUAL (INSECURE) OTP CHECK === ---
    if (enteredOtp === String(signUpData.otp)) {
        console.log(`INSECURE local OTP verification SUCCESSFUL for: ${signUpData.email}`);
        displayStatus('otpStatus', 'Verification successful! Creating account...', 'loading');

        // # NOTE: Simulate backend processing delay
        setTimeout(() => {
            try {
                // # NOTE: Final check for email existence before adding (in case of race condition)
                let localUsers = JSON.parse(localStorage.getItem('clickngoUsers') || '[]');
                if (localUsers.some(user => user.email === signUpData.email)) {
                    console.error(`Race Condition or duplicate attempt detected for: ${signUpData.email}`);
                    displayError(otpErrorEl, "This email was registered during verification. Please try logging in.");
                    displayStatus('otpStatus', '', null);
                    sessionStorage.removeItem('signUpData');
                    setTimeout(resetToAuthState, 3500);
                    return;
                }

                // --- === ADDING THE INSECURE USER DATA === ---
                const newUser = {
                    email: signUpData.email,
                    // # NOTE: !!! Storing plaintext password - EXTREMELY BAD !!!
                    password: signUpData.password,
                    location: signUpData.location,
                    phone: signUpData.phone,
                    role: signUpData.role,
                    uid: `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`, // Generate a semi-unique local ID
                    isFirebaseUser: false, // # NOTE: Flag as insecure local user
                    displayName: signUpData.email.split('@')[0] // Default display name
                };
                console.warn(`Creating INSECURE local user account:`, { email: newUser.email, uid: newUser.uid });
                localUsers.push(newUser);
                localStorage.setItem('clickngoUsers', JSON.stringify(localUsers)); // # NOTE: Save updated list

                // # NOTE: Clean up temporary data
                sessionStorage.removeItem('signUpData');

                // # NOTE: "Log in" the newly created insecure user
                currentUser = newUser;
                localStorage.setItem('clickngoUser', JSON.stringify(currentUser)); // Set current session

                displayStatus('otpStatus', 'Account created! Loading application...', 'success');

                // # NOTE: Transition to the main app
                setTimeout(() => {
                    updateUIForSignedInUser(currentUser);
                    displayStatus('otpStatus', '', null); // Clear OTP status message
                }, 1000);

            } catch (storageError) {
                console.error("Error saving user to Local Storage:", storageError);
                displayError(otpErrorEl, "Failed to save account data locally. Please try again.");
                displayStatus('otpStatus', '', null);
                 sessionStorage.removeItem('signUpData'); // # NOTE: Cleanup session data on error too
            }
        }, 1200); // # NOTE: End of simulated delay

    } else {
        // # NOTE: OTP Verification Failed
        console.log(`INSECURE local OTP verification FAILED for: ${signUpData.email}`);
        displayError(otpErrorEl, "Incorrect OTP code entered. Please try again.");
        if (otpInput) otpInput.value = ''; // Clear the wrong OTP
        otpInput?.focus(); // Allow easy re-entry
        displayStatus('otpStatus', '', null); // Clear loading/success message
    }
}

function handleLocalLogin(event) {
    event.preventDefault();
    console.warn("--- INSECURE LOCAL LOGIN ATTEMPT ---");
    clearAllErrors();

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const generalErrorEl = document.getElementById('loginError');

    let isValid = true;
    if (!validateInput(emailInput, { isEmail: true })) isValid = false;
    if (!validateInput(passwordInput)) isValid = false; // Basic check for non-empty password

    if (!isValid) {
        displayError(generalErrorEl, 'Please enter a valid email and password.');
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    displayStatus('authMessage', 'Checking credentials (local demo)...', 'loading');

    // # NOTE: Simulate checking credentials with a delay
    setTimeout(() => {
        try {
            const localUsers = JSON.parse(localStorage.getItem('clickngoUsers') || '[]');

            // --- === THE INSECURE CHECK === ---
            // # NOTE: Find user by email AND matching plaintext password. !!! TERRIBLE PRACTICE !!!
            const foundUser = localUsers.find(user =>
                user.email === email &&
                user.password === password && // # NOTE: Comparing stored plaintext password!
                !user.isFirebaseUser // # NOTE: Ensure it's specifically a local demo account
            );

            if (foundUser) {
                console.log(`INSECURE local login SUCCESSFUL for: ${email}`);
                displayStatus('authMessage', 'Login successful! Loading app...', 'success');

                currentUser = foundUser; // # NOTE: Set the found insecure user as current
                localStorage.setItem('clickngoUser', JSON.stringify(currentUser)); // # NOTE: Save session

                // # NOTE: Transition to app
                setTimeout(() => {
                    updateUIForSignedInUser(currentUser);
                    displayStatus('authMessage', '', null); // Clear message
                }, 1000);

            } else {
                console.log(`INSECURE local login FAILED for: ${email}`);
                displayError(generalErrorEl, 'Invalid email or password for local demo account.');
                displayStatus('authMessage', '', null);
                passwordInput.value = ''; // Clear password field on failure
                passwordInput.focus();
            }
        } catch (err) {
            console.error("Error during local login check:", err);
            displayError(generalErrorEl, 'An error occurred during login. Please try again.');
            displayStatus('authMessage', '', null);
        }
    }, 800); // # NOTE: End of simulated delay
}
// --- =========================================== --- //
// --- !!! END OF INSECURE LOCAL AUTH SECTION !!! --- //
// --- =========================================== --- //


// --- User Profile & Admin ---

// # NOTE: Loads users ONLY from the INSECURE localStorage list for the Admin panel demo
function loadAllUsers() {
    console.warn("Admin Panel: Loading users from INSECURE local storage...");
    const displayArea = document.getElementById('allUsers');
    if (!displayArea) { console.error("Admin user display area not found."); return; }

    displayArea.innerHTML = '<div class="loading-message loading">Loading local user list...</div>';

    // # NOTE: Simulate loading delay
    setTimeout(() => {
        try {
            const localUsers = JSON.parse(localStorage.getItem('clickngoUsers') || '[]');

            if (localUsers.length === 0) {
                displayArea.innerHTML = '<p class="placeholder-text">No users found in the local (insecure) storage.</p>';
                return;
            }

            displayArea.innerHTML = ''; // Clear loading message
            const userList = document.createElement('ul');
            userList.className = 'user-list-items'; // Add a class for styling if needed
             localUsers.forEach(user => {
                 const li = document.createElement('li');
                 // # NOTE: Display user details - careful not to show password!
                 li.innerHTML = `
                     <strong>Email:</strong> ${user.email || '?'}<br>
                     <strong>Name:</strong> ${user.displayName || '(Not set)'}<br>
                     <small><strong>UID:</strong> ${user.uid || 'N/A'}</small><br>
                     <strong>Loc:</strong> ${user.location || '?'}<br>
                     <strong>Phone:</strong> ${user.phone || '?'}<br>
                     <strong>Role:</strong> ${user.role || '?'}
                     ${user.isFirebaseUser ? '<br><span class="status-highlight status-delivered">Firebase User</span>' : '<br><span class="status-highlight status-cancelled">Local (Insecure)</span>'}
                 `;
                 userList.appendChild(li);
            });
            displayArea.appendChild(userList);

        } catch (error) {
            console.error("Admin: Error loading or parsing local users:", error);
            displayArea.innerHTML = '<p class="error-message">Error loading user list.</p>';
        }
    }, 500);
}

async function deleteAccount() {
    if (!currentUser) {
        alert("You must be logged in to delete your account.");
        return;
    }

    const userEmail = currentUser.email;
    const isFirebase = currentUser.isFirebaseUser;
    const uid = currentUser.uid;
    console.log(`Account deletion requested for: ${userEmail} (Firebase: ${isFirebase}, UID: ${uid})`);

    if (!confirm(`ARE YOU ABSOLUTELY SURE?\n\nThis will permanently delete your account (${userEmail}) and cannot be undone.`)) {
        console.log("Account deletion cancelled by user.");
        return;
    }

    displayStatus('authMessage', 'Deleting account...', 'loading'); // Use auth message area for feedback

    if (isFirebase && uid && auth) {
        // --- Firebase Account Deletion ---
        const fbUser = auth.currentUser;
        // # NOTE: Double-check if the currently authenticated Firebase user matches the local currentUser
        if (fbUser && fbUser.uid === uid) {
            try {
                await deleteUser(fbUser); // Firebase Auth deletion
                console.log("Firebase Authentication user deleted successfully.");

                // # NOTE: ** CRITICAL ** Cleanup database data associated with the user.
                // # NOTE: This should ideally be done via Cloud Functions triggered by auth user deletion.
                // # NOTE: Example Manual Cleanup (RTDB - adapt path):
                const userProfileRef = ref(db, `users/${uid}`);
                await set(userProfileRef, null); // Delete profile data
                console.log(`RTDB user profile data for ${uid} removed (manual demo).`);
                // # NOTE: Also remove chat messages, orders, etc. associated with uid. This is complex.

                // # NOTE: Cleanup local storage artifacts (supplemental + main session)
                localStorage.removeItem(`role_${uid}`);
                localStorage.removeItem(`location_${uid}`);
                localStorage.removeItem(`phone_${uid}`);
                localStorage.removeItem('clickngoUsers'); // Also remove from insecure list if they somehow ended up there?
                localStorage.removeItem('clickngoUser'); // Clear current session immediately

                alert('Your Firebase account has been successfully deleted.');
                handleLogout(); // Trigger full local logout and UI reset
                displayStatus('authMessage', '', null);

            } catch (error) {
                console.error("Firebase account deletion error:", error);
                displayStatus('authMessage', '', null);
                if (error.code === 'auth/requires-recent-login') {
                    alert("This is a sensitive operation and requires you to have signed in recently.\nPlease sign out, sign back in, and then try deleting your account immediately.");
                     // # NOTE: Optionally trigger logout here to force re-auth
                     // logoutFirebase();
                } else {
                    alert(`Error deleting account: ${error.message}\nPlease try again or contact support.`);
                }
            }
        } else {
            console.error("Deletion Mismatch: Local user UID does not match Firebase authenticated user UID!");
            alert("Authentication mismatch. Please log out, log back in securely, and try deleting again.");
            displayStatus('authMessage', '', null);
            logoutFirebase(); // Force logout on mismatch
        }

    } else if (!isFirebase && userEmail) {
        // --- Insecure Local Account Deletion ---
        console.warn(`Attempting to delete INSECURE local user account: ${userEmail}`);
        try {
            let localUsers = JSON.parse(localStorage.getItem('clickngoUsers') || '[]');
            const initialLength = localUsers.length;
            localUsers = localUsers.filter(user => !(user.email === userEmail && !user.isFirebaseUser)); // Find matching insecure user

            if (localUsers.length < initialLength) {
                localStorage.setItem('clickngoUsers', JSON.stringify(localUsers)); // Save the filtered list
                console.log("Insecure local user removed from localStorage list.");
                localStorage.removeItem('clickngoUser'); // Clear current session
                alert('Local demo account data removed from this browser.');
                handleLogout(); // Trigger UI reset
                displayStatus('authMessage', '', null);
            } else {
                console.warn("Could not find matching insecure local user to delete.");
                alert('Could not find the specified local demo account data to remove.');
                 displayStatus('authMessage', '', null);
                 // # NOTE: Still log out locally even if removal failed
                 handleLogout();
            }
        } catch (error) {
            console.error("Error removing insecure local user data:", error);
            alert("An error occurred while removing local account data.");
             displayStatus('authMessage', '', null);
             handleLogout(); // Attempt cleanup despite error
        }

    } else {
        console.error("Cannot delete account: Invalid user state.", currentUser);
        alert("An internal error occurred. Cannot determine account type for deletion.");
         displayStatus('authMessage', '', null);
    }
}


// --- Prompts (Replace with UI Modals/Forms for Real Apps) ---
// # NOTE: These prompt() calls are BAD PRACTICE for user experience and security.
// # NOTE: Use dedicated UI forms/modals within the application flow.
function promptUserForRole(name){
    console.warn("Using insecure PROMPT for Role acquisition - Replace with proper UI!");
    let role = prompt(`Welcome ${name || 'User'}! What is your role? (customer, driver, admin)`, "customer");
    role = role ? role.trim().toLowerCase() : 'customer'; // Default to customer if cancelled/empty
    if (!['customer', 'driver', 'admin'].includes(role)) {
        role = 'customer'; // Default if invalid role entered
    }
    return role;
}
function promptUserForLocation(){
    console.warn("Using insecure PROMPT for Location acquisition - Replace with proper UI!");
    const location = prompt("Please enter your primary city or area:", "");
    return location ? location.trim() : "Not Set";
}
function promptUserForPhone(){
    console.warn("Using insecure PROMPT for Phone acquisition - Replace with proper UI!");
    const phone = prompt("Please enter your phone number (optional):", "");
    // # NOTE: Add basic validation if needed, e.g., check if numeric
    return phone ? phone.trim() : "N/A";
}

// --- Feature Functions (Local Storage Based Demos) ---
// # NOTE: simulateOrder, showOrderHistory, updateTracking remain largely unchanged
// # NOTE: as they are demo features based on insecure localStorage.
function simulateOrder() {
    if (!currentUser) { alert("Please log in first."); return; }
    console.log(`Simulating order placement for: ${currentUser.email}`);
    try {
        let orders = JSON.parse(localStorage.getItem('clickngoOrders') || '[]');
        const newOrder = {
            orderId: `CNG-${Date.now().toString().slice(-7)}_${Math.random().toString(36).substring(2, 5)}`,
            userEmail: currentUser.email,
            userId: currentUser.uid, // # NOTE: Include UID
            date: new Date().toLocaleString(),
            items: "Simulated Package Delivery",
            status: "Pending", // Initial status
            location: currentUser.location || 'Unknown Location',
            timestamp: Date.now() // Add timestamp for sorting
        };
        orders.push(newOrder);
        localStorage.setItem('clickngoOrders', JSON.stringify(orders)); // # NOTE: Use a distinct key for orders
        alert(`Simulated Order (#${newOrder.orderId}) Placed!\nCheck 'Order History'.`);

        // # NOTE: Update UI immediately
        showOrderHistory(); // Refresh history view
        updateTracking(newOrder.orderId); // Start tracking simulation

        // # NOTE: Navigate to the section containing tracking if not already there
         const orderSection = document.getElementById('orderItemsSection');
         if (orderSection && !orderSection.classList.contains('active-section')) {
             switchSection('orderItemsSection');
         }

    } catch (error) {
        console.error("Error during simulateOrder:", error);
        alert("An error occurred while simulating the order placement.");
    }
}

function showOrderHistory() {
    console.log("Attempting to show order history for:", currentUser?.email);
    const historySection = document.getElementById('orderHistorySection');
    const orderListElement = document.getElementById('orderList');
    if (!orderListElement || !historySection) {
        console.error("Order history display elements not found.");
        return;
    }

    // # NOTE: Navigate to history section if not active
     if (!historySection.classList.contains('active-section')) {
         switchSection('orderHistorySection');
     }

    orderListElement.innerHTML = '<div class="loading-message loading">Loading history...</div>';

    // # NOTE: Simulate loading delay
    setTimeout(() => {
        try {
            const allOrders = JSON.parse(localStorage.getItem('clickngoOrders') || '[]');
            const isAdmin = currentUser?.role === 'admin';

            // # NOTE: Filter orders: Show all for admin, otherwise only user's orders
            const userOrders = isAdmin ? allOrders : allOrders.filter(order =>
                (order.userId && order.userId === currentUser?.uid) || // Prefer UID match
                (!order.userId && order.userEmail === currentUser?.email) // Fallback to email for older/local orders
            );

             // # NOTE: Sort by timestamp descending (newest first)
             userOrders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            orderListElement.innerHTML = ''; // Clear loading message

            if (userOrders.length === 0) {
                orderListElement.innerHTML = '<p class="placeholder-text">No order history found.</p>';
                return;
            }

            userOrders.forEach(order => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'order-history-item card'; // Use card style

                const statusClass = `status-${(order.status || '?').toLowerCase().replace(/\s+/g, '-')}`;

                itemDiv.innerHTML = `
                    <h4>Order #${order.orderId || '?'}</h4>
                    <p><strong>Date:</strong> ${order.date || '?'}</p>
                    <p><strong>Items:</strong> ${order.items || '?'}</p>
                    <p><strong>Status:</strong> <span class="status-highlight ${statusClass}">${order.status || '?'}</span></p>
                    ${isAdmin ? `<hr><p><small>User: ${order.userEmail || order.userId || '?'} (${order.location || '?'})</small></p>` : ''}
                `;
                orderListElement.appendChild(itemDiv);
            });

        } catch (error) {
            console.error("Error loading or parsing order history from localStorage:", error);
            orderListElement.innerHTML = '<p class="error-message">Failed to load order history.</p>';
        }
    }, 400);
}

// # NOTE: Stores interval ID globally, ensure it's cleared correctly
let currentTrackingInterval = null;

function updateTracking(orderId) {
    console.log(`Simulating tracking updates for order: ${orderId}`);
    const trackingPanel = document.getElementById('trackingPanel');
    if (!trackingPanel) {
        console.error("Tracking panel element not found.");
        return;
    }

    // # NOTE: Clear any previous tracking simulation interval
    if (currentTrackingInterval) {
        clearInterval(currentTrackingInterval);
        currentTrackingInterval = null;
        console.log("Cleared previous tracking interval.");
    }

    if (!orderId) {
        trackingPanel.innerHTML = '<p class="placeholder-text">Place or select an order to see tracking details.</p>';
        return;
    }

    trackingPanel.innerHTML = '<div class="loading-message loading">Loading tracking info...</div>';

    // # NOTE: Simulate fetching order details
    setTimeout(() => {
        let order;
        try {
            const orders = JSON.parse(localStorage.getItem('clickngoOrders') || '[]');
            order = orders.find(ord => ord.orderId === orderId);
        } catch (error) {
            console.error("Error reading orders for tracking:", error);
             trackingPanel.innerHTML = `<p class="error-message">Error loading order details for #${orderId}.</p>`;
            return;
        }


        if (!order) {
            trackingPanel.innerHTML = `<p class="error-message">Order #${orderId} not found.</p>`;
            return;
        }

        trackingPanel.innerHTML = `
            <h4>Tracking Order: ${order.orderId}</h4>
            <p id="trackingStatusDisplay">Current Status: ...</p>
            <div id="trackingProgressBar" class="progress-bar-container" aria-hidden="true">
                <div class="progress-bar-fill"></div>
            </div>
            <!-- # NOTE: Add map integration here later -->
        `;

        const statusDisplay = document.getElementById('trackingStatusDisplay');
        const progressBarFill = trackingPanel.querySelector('.progress-bar-fill');
        if (!statusDisplay || !progressBarFill) {
            console.error("Tracking UI elements (status/progress) missing after render.");
            return;
        }

        const stages = ["Pending", "Driver Assigned", "Picking Up", "On the Way", "Delivered", "Cancelled"]; // Added Cancelled
        let currentStageIndex = stages.indexOf(order.status);
        if (currentStageIndex < 0) currentStageIndex = 0; // Default to Pending if status unknown

        // # NOTE: Function to update status display and progress bar
        const updateDisplay = (index) => {
            const stageName = stages[index];
            const isFinished = index >= stages.indexOf("Delivered"); // Delivered or Cancelled counts as finished
            const isCancelled = index === stages.indexOf("Cancelled");

            const statusClass = `status-${stageName.toLowerCase().replace(/\s+/g, '-')}`;
            statusDisplay.innerHTML = `Current Status: <strong class="status-highlight ${statusClass}">${stageName}${(!isFinished && !isCancelled) ? '...' : ''}</strong>`;

             // Update progress bar width
             const progressPercent = isCancelled ? 0 : ( (index + 1) / stages.indexOf("Delivered") + 1) * 100; // Simple linear progress
             progressBarFill.style.width = `${Math.min(100, Math.max(0,progressPercent))}%`; // Clamp between 0-100
             // Change color on completion/cancellation
             if (isCancelled) progressBarFill.style.backgroundColor = 'var(--danger-red)';
             else if (isFinished) progressBarFill.style.backgroundColor = 'var(--primary-green)';
             else progressBarFill.style.backgroundColor = 'var(--link-blue)'; // In progress color

             console.log(`Tracking Update (${orderId}): Status set to ${stageName}`);
        };

        updateDisplay(currentStageIndex); // Show initial status

        // # NOTE: Stop simulation if order is already Delivered or Cancelled
        if (currentStageIndex >= stages.indexOf("Delivered")) {
            console.log(`Tracking simulation for ${orderId} stopped: Already at final state (${stages[currentStageIndex]}).`);
            return;
        }

        // # NOTE: Start interval to simulate progress
        currentTrackingInterval = setInterval(() => {
            currentStageIndex++;
            updateDisplay(currentStageIndex);

            // # NOTE: Update the status in localStorage (still insecure demo logic)
            try {
                let currentOrders = JSON.parse(localStorage.getItem('clickngoOrders') || '[]');
                currentOrders = currentOrders.map(o => (o.orderId === orderId ? { ...o, status: stages[currentStageIndex] } : o));
                localStorage.setItem('clickngoOrders', JSON.stringify(currentOrders));
            } catch(e) {
                console.error("Error updating simulated order status in LS:", e);
            }

            // # NOTE: Stop interval when "Delivered" is reached
            if (currentStageIndex >= stages.indexOf("Delivered")) {
                console.log(`Tracking simulation for ${orderId} FINISHED: Delivered.`);
                clearInterval(currentTrackingInterval);
                currentTrackingInterval = null;
                // # NOTE: Optionally refresh history if visible
                if (document.getElementById('orderHistorySection')?.classList.contains('active-section')) {
                    showOrderHistory();
                }
            }
        // # NOTE: Randomize interval slightly for more realistic simulation
        }, 4000 + Math.random() * 3000); // Update every 4-7 seconds

    }, 600); // # NOTE: End of simulated fetch delay
}

// --- Realtime Chat Functions (Firebase RTDB) ---

function setupChatListener() {
    // # NOTE: Pre-conditions check
    if (!db || !chatMessagesRef) {
         console.error("Chat listener setup PREVENTED: DB service/reference not available.");
         return;
    }
     // # NOTE: User must be logged in
    if (!currentUser || !currentUser.uid) {
        console.warn("Chat listener setup PREVENTED: User not logged in.");
         const messagesDiv = document.getElementById('chatMessages');
         if (messagesDiv) messagesDiv.innerHTML = '<p class="error-message">Please log in to use chat.</p>';
        return;
    }
     // # NOTE: Prevent duplicate listeners
    if (chatListenerUnsubscribe) {
        console.log("Chat listener is already active. Skipping setup.");
        return;
    }

    console.log("%c Setting up Firebase RTDB chat listener...", "color: blue; font-weight: bold;", chatMessagesRef.toString());
    const messagesDiv = document.getElementById('chatMessages');
    if (!messagesDiv) {
        console.error("FATAL: Chat messages display element (#chatMessages) not found during listener setup.");
        return;
    }
    // # NOTE: Show loading indicator while attaching/fetching initial data
    messagesDiv.innerHTML = '<div class="loading-message loading">Connecting to chat...</div>';

    try {
        // # NOTE: Attach the listener using onValue
        chatListenerUnsubscribe = onValue(chatMessagesRef, (snapshot) => {
            // # NOTE: This callback runs initially and whenever data changes
            console.log("%c Firebase onValue triggered! Processing snapshot...", "color: green;");

            // --- Safety Checks Inside Callback ---
             // # NOTE: Get display div again, it might have changed if sections switched fast
             const currentMessagesDiv = document.getElementById('chatMessages');
             if (!currentMessagesDiv) {
                 console.error("#chatMessages element disappeared mid-callback!");
                 detachChatListener(); // Detach if display is gone
                 return;
             }
            // # NOTE: Crucial: Verify currentUser is STILL valid inside this async callback
             if (!currentUser || !currentUser.uid) {
                  console.error("currentUser became invalid inside the onValue callback! Cannot reliably display chat. Detaching.");
                   currentMessagesDiv.innerHTML = '<p class="error-message">Chat session error. Please refresh or log in again.</p>';
                   detachChatListener();
                  return;
             }
            // --- End Safety Checks ---

            currentMessagesDiv.innerHTML = ''; // Clear previous messages/loading indicator

            if (!snapshot.exists() || !snapshot.hasChildren()) {
                console.log("Chat snapshot is empty or has no children. Displaying 'No messages'.");
                currentMessagesDiv.innerHTML = '<p class="placeholder-text"><i>No messages yet. Be the first to chat!</i></p>';
                return;
            }

            const messages = snapshot.val();
            // console.log("Raw messages data:", messages); // # NOTE: Optional: Log raw data for debugging

            let messageCount = 0;
            let errorCount = 0;
            try {
                // # NOTE: Get message keys, sort them by timestamp (robust handling)
                 const sortedKeys = Object.keys(messages).sort((keyA, keyB) => {
                    const tsA = messages[keyA]?.timestamp || 0;
                    const tsB = messages[keyB]?.timestamp || 0;
                    return tsA - tsB;
                });
                // console.log(`Processing ${sortedKeys.length} message keys.`);

                sortedKeys.forEach(key => {
                    const messageData = messages[key];

                    // # NOTE: Validate essential message data before rendering
                    if (!messageData || typeof messageData.text !== 'string' || !messageData.text.trim() || typeof messageData.senderUid !== 'string') {
                        console.warn(`Skipping invalid message (key: ${key}):`, messageData);
                        errorCount++;
                        return; // Skip this message
                    }

                    const messageElement = document.createElement('div');
                    messageElement.classList.add('message');

                    // # NOTE: Determine if message is user's own or incoming
                    if (messageData.senderUid === currentUser.uid) {
                        messageElement.classList.add('own');
                         // # NOTE: Sanitize text before setting as textContent (prevents basic HTML injection)
                        messageElement.textContent = messageData.text;
                    } else {
                        messageElement.classList.add('incoming');
                        const senderDisplayName = messageData.senderName || 'Guest'; // Fallback name
                         // # NOTE: Sanitize before using innerHTML - Very basic example
                         const sanitizedSender = senderDisplayName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                         const sanitizedText = messageData.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        messageElement.innerHTML = `<strong>${sanitizedSender}:</strong> ${sanitizedText}`;
                         // # NOTE: Ideally use a proper sanitization library (like DOMPurify) if allowing any HTML
                    }

                    // # NOTE: Add timestamp if available and valid
                     if (typeof messageData.timestamp === 'number' && messageData.timestamp > 0) {
                        const timestampSpan = document.createElement('span');
                        timestampSpan.classList.add('message-timestamp');
                        try {
                            timestampSpan.textContent = new Date(messageData.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                        } catch (e) {
                           console.warn("Failed to format timestamp for message:", key, e);
                           timestampSpan.textContent = '?:??'; // Fallback timestamp display
                        }
                        messageElement.appendChild(timestampSpan);
                     }

                    currentMessagesDiv.appendChild(messageElement);
                    messageCount++;
                });

                if (errorCount > 0) {
                     console.warn(`Finished processing chat messages. ${messageCount} displayed, ${errorCount} skipped due to errors.`);
                } else {
                     // console.log(`Displayed ${messageCount} chat messages.`);
                 }

                 // # NOTE: Smooth scroll to the bottom only if user isn't scrolled up manually
                 // # NOTE: This check prevents annoying jumps if user is reading older messages
                 const isScrolledToBottom = currentMessagesDiv.scrollHeight - currentMessagesDiv.clientHeight <= currentMessagesDiv.scrollTop + 1; // +1 for tolerance
                 if (isScrolledToBottom) {
                    currentMessagesDiv.scrollTop = currentMessagesDiv.scrollHeight;
                 } else {
                     console.log("User is scrolled up, not auto-scrolling chat.");
                     // # NOTE: Optionally show a "New Messages" indicator button here
                 }


            } catch (renderError) {
                console.error("Error occurred WHILE PROCESSING/RENDERING chat messages:", renderError);
                 if(currentMessagesDiv) currentMessagesDiv.innerHTML = '<p class="error-message">Error displaying messages. Check console.</p>';
                 // # NOTE: Optionally detach listener on render error?
                 // detachChatListener();
            }

        }, (error) => {
            // # NOTE: Handle errors during the listener setup or subsequent database reads
            console.error("%c Firebase RTDB onValue Listener Error:", "color: red; font-weight: bold;", error);
            const currentMessagesDiv = document.getElementById('chatMessages');
            if (currentMessagesDiv) {
                let errorMessage = `Error loading chat. (${error.code || 'Unknown error'}).`;
                 if (error.message && error.message.includes('permission_denied')) {
                      errorMessage += " Please check Database Security Rules.";
                 } else {
                     errorMessage += " Check connection or Rules.";
                 }
                currentMessagesDiv.innerHTML = `<p class="error-message">${errorMessage}</p>`;
            }
            detachChatListener(); // # NOTE: Detach listener on read error to prevent loops/further issues
        });

        console.log("Firebase chat listener (onValue) registration SUCCESSFUL.");

    } catch (attachError) {
         // # NOTE: Catch errors specifically from the onValue registration call itself
         console.error("%c Failed to attach Firebase chat listener:", "color: red; font-weight: bold;", attachError);
         if (messagesDiv) {
              messagesDiv.innerHTML = `<p class="error-message">Could not connect to chat service. (${attachError.message})</p>`;
         }
         chatListenerUnsubscribe = null; // Ensure it's null if setup failed
    }
}


function detachChatListener() {
    if (chatListenerUnsubscribe) {
        console.log("%c <<<< Detaching Firebase Realtime Database chat listener >>>>", "color: orange;");
        try {
            // # NOTE: Use the `off` function correctly if `onValue` returns the ref + event type
             // off(chatMessagesRef, 'value', chatListenerUnsubscribe); // Older method pattern
            chatListenerUnsubscribe(); // # NOTE: The return function from onValue IS the unsubscriber
            chatListenerUnsubscribe = null;
            console.log("Chat listener detached successfully.");
        } catch (error) {
             console.error("Error detaching chat listener:", error);
             // # NOTE: Still nullify the reference even if detach fails somehow
             chatListenerUnsubscribe = null;
         }

         // # NOTE: Clear chat display when listener is detached? Optional.
         // const messagesDiv = document.getElementById('chatMessages');
         // if (messagesDiv) messagesDiv.innerHTML = '<p><i>Chat disconnected.</i></p>';

    } else {
        // console.log("No active chat listener was found to detach."); // # NOTE: Optional log
    }
}


function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) { console.error("Chat input element #chatInput not found."); return; }
    const messageText = chatInput.value.trim();
    const sendButton = document.getElementById('chatSendButton'); // # NOTE: To disable while sending

    // --- Pre-send Validations ---
    if (!currentUser || !currentUser.uid || !currentUser.displayName) {
        console.warn("SendMessage Prevented: User not fully logged in or profile incomplete.", currentUser);
        alert("You must be logged in with a valid profile to send messages.");
        return;
    }
    if (!db || !chatMessagesRef) {
         console.error("SendMessage Prevented: Database service/reference not available.");
         alert("Chat service is temporarily unavailable. Please try again later.");
         return;
    }
    if (!messageText) {
        console.log("Empty chat message ignored.");
        // # NOTE: Provide visual feedback for empty message?
        chatInput.focus();
        return;
    }
    // --- End Validations ---

    console.log(`Sending chat message as ${currentUser.displayName} (UID: ${currentUser.uid}): "${messageText}"`);

    // # NOTE: Disable input/button while sending to prevent duplicates
    chatInput.disabled = true;
    if (sendButton) sendButton.disabled = true;
     displayStatus('chatStatus', 'Sending...', 'loading'); // # NOTE: Need a chatStatus element

    // # NOTE: Prepare message data securely
    const messageData = {
        text: messageText, // # NOTE: Firebase Rules should handle any further validation/sanitization if needed
        senderUid: currentUser.uid,
        senderName: currentUser.displayName, // Use verified name
        timestamp: serverTimestamp() // Critical: Use server time
    };

    // # NOTE: Generate a unique ID using push() and save the message using set()
    const newMessageRef = push(chatMessagesRef);
    set(newMessageRef, messageData)
        .then(() => {
            console.log("Message sent successfully to RTDB path:", newMessageRef.key); // Log the key
            chatInput.value = ''; // Clear input field on success
            displayStatus('chatStatus', '', null); // Clear sending status
        })
        .catch((error) => {
            console.error("Error sending message to Firebase RTDB:", error);
            alert(`Failed to send message: ${error.message}.\nPlease check your connection or database rules.`);
            // # NOTE: Do NOT clear input on error, allow user retry
            displayStatus('chatStatus', 'Send failed.', 'error');
        })
        .finally(() => {
            // # NOTE: Re-enable input/button regardless of success/failure
            chatInput.disabled = false;
            if (sendButton) sendButton.disabled = false;
            chatInput.focus(); // Set focus back to input
            // # NOTE: Clear status message after a delay if it wasn't already cleared
             setTimeout(() => displayStatus('chatStatus', '', null), 2000);
        });
    // # NOTE: The 'onValue' listener will automatically pick up and display this message if successful.
}


// --- Feedback Function (Local Storage Demo) ---
function submitFeedback(event) {
    event.preventDefault();
    if (!currentUser) { alert("Please log in to send feedback."); return; }

    const messageTextarea = document.getElementById('feedbackMessage');
    const statusElement = document.getElementById('feedbackStatus');
    const errorElement = document.getElementById('feedbackMessageError');

    if (!messageTextarea || !statusElement || !errorElement) {
         console.error("Feedback form elements missing.");
         return;
    }

     if (!validateInput(messageTextarea, { minLength: 10 })) { // Add min length
         displayStatus('feedbackStatus', '', null); // Clear status
         return;
     }

    const message = messageTextarea.value.trim();
    console.log(`Feedback received from ${currentUser.email} (UID: ${currentUser.uid})`);
    displayStatus('feedbackStatus', 'Submitting feedback...', 'loading');
    messageTextarea.disabled = true;
    const submitButton = event.target.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;


    // # NOTE: Simulate sending feedback (replace with actual backend/DB logic)
    setTimeout(() => {
        try {
            // # NOTE: Saving to local storage is just for demo. Use Firestore/RTDB in real app.
            const feedbackEntries = JSON.parse(localStorage.getItem('appFeedback') || '[]');
            feedbackEntries.push({
                userEmail: currentUser.email,
                userId: currentUser.uid,
                message: message,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent // # NOTE: Example extra info
            });
            localStorage.setItem('appFeedback', JSON.stringify(feedbackEntries));

            console.log("Feedback saved to local storage (Demo).");
            displayStatus('feedbackStatus', 'Feedback submitted successfully! Thank you.', 'success');
            messageTextarea.value = ''; // Clear textarea
            // # NOTE: Optionally notify user more visibly
            // notifyUser("Thank you for your feedback!");

            // # NOTE: Clear success message after a few seconds
            setTimeout(() => displayStatus('feedbackStatus', '', null), 4000);

        } catch (error) {
            console.error("Error saving feedback (local demo):", error);
            displayStatus('feedbackStatus', 'Could not submit feedback due to an error.', 'error');
        } finally {
             // # NOTE: Re-enable form
            messageTextarea.disabled = false;
            if (submitButton) submitButton.disabled = false;
        }
    }, 1000); // Simulate network delay
}

// --- Settings & Preferences (Local Storage Demo) ---

function loadPreferences() {
    try {
        const prefsString = localStorage.getItem('userPreferences');
        const prefs = prefsString ? JSON.parse(prefsString) : {}; // Default to empty object

        // --- Language ---
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect && prefs.language) {
            languageSelect.value = prefs.language;
             // # NOTE: Add logic here to actually apply language translations if implemented
        }

        // --- Theme ---
        const theme = prefs.theme || 'light'; // Default to light
        const darkModeToggle = document.getElementById('darkModeToggle');
        const isDark = theme === 'dark';

        document.body.classList.toggle('dark-mode', isDark);
        if (darkModeToggle) darkModeToggle.checked = isDark;

        console.log("Preferences loaded:", prefs);

    } catch (error) {
        console.error("Failed to load user preferences:", error);
        // # NOTE: Apply default theme if loading fails
        document.body.classList.remove('dark-mode');
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) darkModeToggle.checked = false;
    }
}

function savePreferences() {
    const statusElement = document.getElementById('userPreferencesStatus');
    if (!statusElement) return;

    displayStatus('userPreferencesStatus', 'Saving preferences...', 'loading');

    // # NOTE: Simulate save delay
    setTimeout(() => {
        try {
            const language = document.getElementById('languageSelect')?.value || 'en';
            const theme = document.getElementById('darkModeToggle')?.checked ? 'dark' : 'light';

            const prefs = { language, theme };
            localStorage.setItem('userPreferences', JSON.stringify(prefs));

            console.log("Preferences saved:", prefs);
            displayStatus('userPreferencesStatus', 'Preferences saved!', 'success');
            // # NOTE: Optionally apply theme immediately again if toggleDarkMode didn't trigger save
             document.body.classList.toggle('dark-mode', theme === 'dark');

            // # NOTE: Clear status message
            setTimeout(() => displayStatus('userPreferencesStatus', '', null), 2500);

        } catch (error) {
            console.error("Failed to save preferences:", error);
            displayStatus('userPreferencesStatus', 'Error saving preferences.', 'error');
        }
    }, 400);
}

function toggleDarkMode() {
    // # NOTE: This function just toggles the class; loadPreferences applies it initially, savePreferences persists it.
    const isDarkModeEnabled = document.body.classList.toggle('dark-mode');
    console.log(`Dark Mode Toggled: ${isDarkModeEnabled ? 'ON' : 'OFF'}.`);
    // # NOTE: Update the toggle switch state if it exists and isn't the trigger
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle && darkModeToggle.checked !== isDarkModeEnabled) {
        darkModeToggle.checked = isDarkModeEnabled;
    }
     // # NOTE: Immediately save the preference when toggled
     savePreferences();
}

// --- Utility Functions ---

// # NOTE: Loads static FAQ content
function loadFaq() {
    const faqListElement = document.getElementById('faqList');
    if (!faqListElement) return;
    faqListElement.innerHTML = ''; // Clear existing

     // # NOTE: Static FAQ data. Could be fetched from a CMS or JSON file.
    const faqs = [
        { q: "What services does Click n' Go offer?", a: "We provide on-demand 12-hour motor-taxi rides and delivery services (food, groceries, packages, etc.) within our service area in Boac, Marinduque." },
        { q: "How do I book a service?", a: "Currently, bookings are primarily handled through Direct Messages (DM) on our Facebook page. Click the 'Book on Facebook' button in the Services section. In-app booking is planned for the future!" },
        { q: "What are your operating hours?", a: "We typically operate 12 hours daily. Please check our Facebook page for the most current operating hours and any announcements." },
        { q: "How much do services cost?", a: "Pricing varies based on distance, service type, and specific requirements. Please contact us via Facebook Messenger for a quote before booking." },
        { q: "How can I contact support?", a: "You can reach us via Email (clickngoservice@gmail.com), Phone (0916 554 0988), or Facebook Messenger through our page." },
         { q: "Is my data secure?", a: "We recommend using the secure 'Sign in with Google' option. The local email/password signup/login provided is **for demo purposes only and is not secure**." }
    ];

    if (faqs.length === 0) {
        faqListElement.innerHTML = '<p>No FAQs available at the moment.</p>';
        return;
    }

    faqs.forEach(faq => {
        const faqItemDiv = document.createElement('div');
        faqItemDiv.className = 'faq-item';
        faqItemDiv.innerHTML = `
            <p class="faq-question"><strong>Q:</strong> ${faq.q}</p>
            <p class="faq-answer"><strong>A:</strong> ${faq.a}</p>
        `;
        // # NOTE: Could add toggle functionality here
        faqListElement.appendChild(faqItemDiv);
    });
    console.log(`Loaded ${faqs.length} FAQs.`);
}

// # NOTE: Helper to safely set text content
function setText(elementId, text, defaultValue = "...") {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text || defaultValue;
    } else {
        // console.warn(`setText: Element #${elementId} not found.`);
    }
}
// # NOTE: Helper to safely set inner HTML (Use with caution!)
function setTextHTML(elementId, html, defaultValue = "") {
     const element = document.getElementById(elementId);
    if (element) {
        // # NOTE: Basic sanitization is NOT enough for arbitrary HTML. Use a library if needed.
         element.innerHTML = html || defaultValue;
    } else {
         // console.warn(`setTextHTML: Element #${elementId} not found.`);
     }
}

function updateClock() {
    const timeElement = document.getElementById('clockTime');
    const dateElement = document.getElementById('clockDate');
    const now = new Date();

    if (timeElement) {
        timeElement.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); // Force 24hr? Or use locale default?
    }
    // # NOTE: Update date less frequently if desired, but fine per second here
    if (dateElement) {
        dateElement.innerText = now.toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    }
}

function displayWelcomeMessage() {
    const welcomeElement = document.getElementById('welcomeMessage');
    if (!welcomeElement) return;
    const currentHour = new Date().getHours();
    let greeting = "Good evening";
    if (currentHour < 5) { greeting = "Good night"; }
    else if (currentHour < 12) { greeting = "Good morning"; }
    else if (currentHour < 18) { greeting = "Good afternoon"; }
    welcomeElement.innerText = greeting + "!";
}


// --- Validation Helper ---
// # NOTE: Basic validation, enhance as needed
function validateInput(inputElement, options = {}) {
     if (!inputElement) return false;

     const value = inputElement.value.trim();
     const errorElementId = inputElement.id + 'Error';
     const errorElement = document.getElementById(errorElementId);
     let errorMessage = '';

     // 1. Check Required
     if (inputElement.required && value === '') {
         errorMessage = 'This field is required.';
     }
     // 2. Check Min Length
     else if (options.minLength && value.length < options.minLength) {
         errorMessage = `Must be at least ${options.minLength} characters long.`;
     }
      // 3. Check Exact Length
     else if (options.exactLength && value.length !== options.exactLength) {
         errorMessage = `Must be exactly ${options.exactLength} characters long.`;
     }
     // 4. Check Email Format
     else if (options.isEmail && !isValidEmail(value)) {
         errorMessage = 'Please enter a valid email address.';
     }
      // 5. Check Phone Format (Basic)
     else if (options.isPhone && !isValidPhoneNumber(value)) {
         errorMessage = 'Please enter a valid phone number.';
     }
       // 6. Check Numeric
     else if (options.isNumeric && !/^\d+$/.test(value)) {
         errorMessage = 'Please enter only numbers.';
     }
       // # NOTE: Add more checks here (max length, patterns, etc.)

     // Display error message
     if (errorElement) {
        displayError(errorElement, errorMessage);
     }

     // Add/Remove error class for visual feedback
     inputElement.classList.toggle('error', !!errorMessage);

     return !errorMessage; // Return true if valid, false otherwise
}

// --- Validation Helpers ---
function isValidEmail(email) {
    if (!email) return false;
    // # NOTE: Simple regex, consider more robust one or library for production
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(String(email).toLowerCase());
}

function isValidPhoneNumber(phone) {
     if (!phone) return false;
    // # NOTE: Very basic check for digits (possibly with a +) - adjust for specific country formats
    const phoneRegex = /^\+?[\d\s-]{7,20}$/; // Allows digits, spaces, hyphens, optional +
     return phoneRegex.test(String(phone));
}

// # NOTE: Simple notification wrapper (requests permission)
function notifyUser(message, options = {}){
    if (!('Notification' in window)) {
        console.warn("Browser does not support desktop notification");
        return;
    }

    if (Notification.permission === 'granted') {
        new Notification('Click n Go', { body: message, icon: './logo-placeholder.png', ...options }); // # NOTE: Add your logo path
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                 new Notification('Click n Go', { body: message, icon: './logo-placeholder.png', ...options });
            } else {
                 console.log("Notification permission denied by user.");
            }
        });
    }
}


function displayStatus(elementIdOrElement, message, type = null) {
    const element = typeof elementIdOrElement === 'string' ? document.getElementById(elementIdOrElement) : elementIdOrElement;
    if (!element) return;

    element.textContent = message || '';
    element.className = 'status-message'; // Reset classes

    if (type === 'loading') element.classList.add('loading'); // Use simpler loading class potentially
    if (type === 'success') element.classList.add('success');
    if (type === 'error') element.classList.add('error');
}

function displayError(elementIdOrElement, message) {
     const element = typeof elementIdOrElement === 'string' ? document.getElementById(elementIdOrElement) : elementIdOrElement;
    if (!element) return;

    element.textContent = message || '';
     element.style.display = message ? 'block' : 'none'; // Show/hide error message
}


function clearAllErrors() {
     // # NOTE: Clear specific input/form error messages
    document.querySelectorAll('.error-message').forEach(el => {
         el.textContent = '';
         el.style.display = 'none';
     });
     // # NOTE: Remove error class from inputs
    document.querySelectorAll('input.error, select.error, textarea.error').forEach(el => {
        el.classList.remove('error');
     });

    // # NOTE: Clear general status messages
    ['authMessage', 'otpStatus', 'feedbackStatus', 'userPreferencesStatus', 'loginError'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '';
            el.className = el.className.includes('status-message') ? 'status-message' : el.className.includes('error-message') ? 'error-message' : ''; // Preserve base class if needed
        }
    });
}

// # NOTE: Full reset function for logout or fatal errors
function resetApp() {
    console.log("--- Resetting Application State and UI ---");
    detachChatListener(); // *** Crucial: Ensure listener is always detached on reset ***

    currentUser = null; // Clear current user variable

    // # NOTE: Clear forms
    document.getElementById('signupFormElem')?.reset();
    document.getElementById('loginFormElem')?.reset();
    document.getElementById('otpForm')?.reset();
    document.getElementById('feedbackForm')?.reset();
     // # NOTE: Add other forms here if needed

    // # NOTE: Reset UI visibility to initial state
    resetToAuthState(); // Shows login page

    // # NOTE: Clear any lingering status/error messages
    clearAllErrors();

    // # NOTE: Reset any other specific UI elements if needed (e.g., tracking panel)
    const trackingPanel = document.getElementById('trackingPanel');
    if (trackingPanel) trackingPanel.innerHTML = '<p class="placeholder-text">Place a simulated order to see tracking details here.</p>';
    if(currentTrackingInterval) clearInterval(currentTrackingInterval);
    currentTrackingInterval = null;
}
