// -------------------------------------
// --- Firebase Initialization ---
// -------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getDatabase,
    ref,
    push,
    set,
    onValue,
    off,
    serverTimestamp,
    query, // Added for fetching user-specific data
    orderByChild, // Added for sorting
    equalTo, // Added for filtering
    get // Added for one-time reads
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ---=== YOUR FIREBASE CONFIGURATION ===---
const firebaseConfig = {
    apiKey: "AIzaSyDB5HOMSqUgpO9Dy3GhI9-vhemmr9sATmg", // Replace if needed
    authDomain: "click-n--go.firebaseapp.com",
    databaseURL: "https://click-n--go-default-rtdb.firebaseio.com",
    projectId: "click-n--go",
    storageBucket: "click-n--go.appspot.com",
    messagingSenderId: "697356789668",
    appId: "1:697356789668:web:33eab0fc45e56274ef8331",
    measurementId: "G-G95S72XP35"
};
// -------------------------------------------

// Firebase Globals
let app;
let analytics = null;
let auth;
let googleProvider;
let db;
let chatMessagesRef;
let chatListenerUnsubscribe = null;
let preferencesRef = null; // For user preferences in RTDB
let preferencesListenerUnsubscribe = null;

// --- ============================================= --- //
// --- !!! CRITICAL SECURITY & USAGE WARNINGS !!! --- //
// --- ============================================= --- //
// 1. INSECURE LOCAL AUTH DEMO: The Email/Password Sign Up & Login
//    is EXTREMELY INSECURE. It stores passwords in plaintext in
//    localStorage. **DO NOT USE THIS FOR ANY REAL APPLICATION.**
//    It's here for DEMONSTRATION purposes of the original structure only.
//    Always use Firebase's secure authentication methods.
//
// 2. FIREBASE SECURITY RULES: YOUR FIREBASE REALTIME DATABASE NEEDS
//    ROBUST SECURITY RULES. Without them, your data is publicly
//    accessible. Example rules:
//    {
//      "rules": {
//        "users": {
//          "$uid": {
//            ".read": "$uid === auth.uid",
//            ".write": "$uid === auth.uid"
//          }
//        },
//        "user-preferences": {
//          "$uid": {
//            ".read": "$uid === auth.uid",
//            ".write": "$uid === auth.uid"
//          }
//        },
//        "chats": {
//          "mainRoom": { // Or specific chat rooms
//            ".read": "auth != null",
//            ".write": "auth != null",
//            ".indexOn": ["timestamp"] // For ordering
//          }
//        },
//        "orders": {
//          ".read": "auth != null", // Or more granular for admins vs users
//          "$orderId": {
//            ".write": "auth != null && (data.child('userId').val() === auth.uid || newData.child('userId').val() === auth.uid)", // Allow user to write their own order
//            ".indexOn": ["userId", "timestamp"]
//          }
//        },
//        "user-orders": {
//          "$uid": {
//            ".read": "$uid === auth.uid",
//            ".write": "$uid === auth.uid" // Only user can write to their own order index
//          }
//        },
//        "feedback": {
//          ".read": "auth != null && auth.token.custom_claims.admin === true", // Example: Admin read
//          "$feedbackId": {
//            ".write": "auth != null" // Allow any authenticated user to submit
//          }
//        }
//        // Add other rules for driver requests etc.
//      }
//    }
//    **IMPLEMENT AND TEST YOUR SECURITY RULES THOROUGHLY!**
//
// 3. ADMIN FUNCTIONALITY: The "Admin Panel (Local List Demo)" only shows
//    users from the insecure local storage. A real admin panel would
//    interact securely with Firebase data.
// ----------------------------------------------------- //


try {
    app = initializeApp(firebaseConfig);
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
    chatMessagesRef = ref(db, 'chats/mainRoom');
    googleProvider = new GoogleAuthProvider();
    console.log("Firebase Core Services (Auth, RTDB) Initialized Successfully.");
} catch (error) {
    console.error("FATAL: Firebase Initialization Failed:", error);
    document.body.innerHTML = `<div style='padding: 30px; text-align: center; color: red;'><h2>Initialization Error</h2><p>Could not connect to critical services. Please check the console log or contact support. Ensure Firebase configuration is correct and project is active.</p></div>`;
    throw new Error("Firebase Initialization Failed - Application cannot continue.");
}

// Global State
let currentUser = null;
let currentTrackingInterval = null;

// --- Initialization & Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    if (!auth || !db) return; // Should be caught by init error, but double check.

    initializeAuthenticationState();
    attachAllEventListeners();
    loadStaticData(); // FAQ (Local for now)
    startTimers(); // Clock and initial welcome message
    // Initial theme load (before user-specific preferences)
    loadPreferences(null); // Load general stored theme preference if any
});

function initializeAuthenticationState() {
    const storedUser = localStorage.getItem('clickngoUser'); // For local demo users session persistence
    if (storedUser) {
        try {
            const parsedUser = JSON.parse(storedUser);
            // Only restore if it's an explicitly local user, Firebase auth will handle its own state
            if (parsedUser && !parsedUser.isFirebaseUser) {
                currentUser = parsedUser;
                console.log("Restored INSECURE local user session:", currentUser?.email);
                setTimeout(() => updateUIForUser(currentUser), 100);
            } else {
                localStorage.removeItem('clickngoUser'); // Clean up if it's a stale Firebase user or invalid
            }
        } catch (e) {
            console.error("Error parsing stored local user data:", e);
            localStorage.removeItem('clickngoUser');
        }
    }

    onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            console.log("Firebase Auth State Change: User Signed In ->", firebaseUser.email);
            displayStatus('authMessage', `Authenticated as ${firebaseUser.email}. Fetching profile...`, 'loading');
            try {
                const userProfileSnapshot = await get(ref(db, `users/${firebaseUser.uid}`));
                let userProfile = userProfileSnapshot.val();

                if (userProfile) {
                    currentUser = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName || userProfile.displayName || firebaseUser.email.split('@')[0],
                        photoURL: firebaseUser.photoURL || userProfile.photoURL || 'avatar-placeholder.png',
                        role: userProfile.role || 'customer',
                        location: userProfile.location || 'Not Set',
                        phone: userProfile.phone || 'N/A',
                        isFirebaseUser: true
                    };
                    console.log("User profile fetched from RTDB:", currentUser.displayName);
                } else {
                    // First-time Google sign-in, profile doesn't exist yet in RTDB
                    console.log("First time Google Sign-In or profile missing for UID:", firebaseUser.uid);
                    const tempRole = promptUserForRole(firebaseUser.displayName || firebaseUser.email.split('@')[0]);
                    const tempLocation = promptUserForLocation();
                    const tempPhone = promptUserForPhone();

                    currentUser = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                        photoURL: firebaseUser.photoURL || 'avatar-placeholder.png',
                        role: tempRole,
                        location: tempLocation,
                        phone: tempPhone,
                        isFirebaseUser: true
                    };
                    await saveUserProfileToDB(currentUser); // Save the newly created profile
                }
                localStorage.setItem('clickngoUser', JSON.stringify(currentUser)); // Save for quick non-Firebase session info, still relying on onAuthStateChanged as truth.
                updateUIForUser(currentUser);
                loadUserPreferences(currentUser.uid); // Load RTDB preferences
                displayStatus('authMessage', '', null);
            } catch (error) {
                console.error("Error fetching/creating user profile:", error);
                displayStatus('authMessage', `Error setting up session: ${error.message}`, 'error');
                // Fallback to basic info if DB ops fail
                currentUser = {
                    uid: firebaseUser.uid, email: firebaseUser.email,
                    displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                    photoURL: firebaseUser.photoURL || 'avatar-placeholder.png',
                    role: 'customer', isFirebaseUser: true
                };
                updateUIForUser(currentUser);
            }
        } else {
            console.log("Firebase Auth State Change: User Signed Out");
            if (currentUser && currentUser.isFirebaseUser) { // Only clear if the active user was a Firebase user
                handleLogout(); // Handles local cleanup and UI reset
            } else if (!currentUser) { // No local user either, ensure auth screen
                resetToAuthState();
            }
             // If currentUser is a local demo user, onAuthStateChanged doesn't affect them unless they try to use Firebase features.
        }
    });
}

function attachAllEventListeners() {
    console.log("Attaching event listeners...");

    // Auth
    document.getElementById('loginFormElem')?.addEventListener('submit', handleLocalLogin);
    document.getElementById('signupFormElem')?.addEventListener('submit', handleLocalSignUp);
    document.getElementById('switchToLoginLink')?.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });
    document.getElementById('switchToSignUpLink')?.addEventListener('click', (e) => { e.preventDefault(); showSignUpForm(); });
    document.getElementById('googleSignInButton')?.addEventListener('click', signInWithGoogleFirebase);
    document.getElementById('logoutButton')?.addEventListener('click', logoutFirebase);
    document.getElementById('verifyOtpButton')?.addEventListener('click', handleLocalOtpVerify);

    // Main App Navigation & Quick Actions
    document.getElementById('bottomNav')?.addEventListener('click', handleNavClick);
    document.getElementById('appContent')?.addEventListener('click', handleContentClick); // For data-section buttons and back buttons
    document.getElementById('showHistoryButton')?.addEventListener('click', () => switchSection('orderHistorySection'));


    // Input Clearing
    document.querySelectorAll('.clear-input').forEach(span => {
        span.addEventListener('click', () => {
            const targetId = span.dataset.clearTarget;
            const input = document.getElementById(targetId);
            if (input) {
                input.value = '';
                input.focus();
                const errorElement = document.getElementById(targetId + 'Error');
                if (errorElement) displayError(errorElement, '');
                input.classList.remove('error');
            }
        });
    });

    // Features
    document.getElementById('simulateOrderButton')?.addEventListener('click', simulateOrderRTDB);
    document.getElementById('chatForm')?.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });
    document.getElementById('deleteAccountButton')?.addEventListener('click', deleteAccountHandler);
    document.getElementById('darkModeToggle')?.addEventListener('change', toggleDarkModeHandler);
    document.getElementById('savePreferencesButton')?.addEventListener('click', saveUserPreferencesToDB);
    document.getElementById('feedbackForm')?.addEventListener('submit', submitFeedbackRTDB);

    // Basic Form Input Validation Feedback
    document.querySelectorAll('#authSection input[required], #otpPage input[required], #feedbackMessage').forEach(input => {
        input.addEventListener('input', () => validateInput(input));
        input.addEventListener('blur', () => validateInput(input));
    });
}

function handleNavClick(event) {
    const button = event.target.closest('button[data-section]');
    if (button && button.dataset.section) {
        switchSection(button.dataset.section);
    }
}
function handleContentClick(event) {
    const button = event.target.closest('button[data-section]');
    if (button && button.dataset.section) {
        switchSection(button.dataset.section);
    } else if (event.target.classList.contains('back-button') && event.target.dataset.section) {
        switchSection(event.target.dataset.section);
    }
}

function loadStaticData() {
    console.log("Loading static data (FAQ)...");
    loadFaq();
    // Initial non-user-specific theme load handled by loadPreferences(null) in DOMContentLoaded
}

function startTimers() {
    updateClock();
    displayWelcomeMessage();
    setInterval(updateClock, 1000);
}

// --- UI Management ---
function updateUIForUser(user) {
    if (!user || !user.email) {
        console.warn("updateUIForUser called with invalid user.", user);
        resetAppToAuth();
        return;
    }
    console.log(`Updating UI for: ${user.email} (Role: ${user.role}, Firebase: ${!!user.isFirebaseUser})`);
    toggleVisibility('authSection', 'none');
    toggleVisibility('otpPage', 'none');
    toggleVisibility('appSection', 'block');

    populateAccountInfo(user);
    updateAvatarDisplays(user.photoURL);
    displayDashboardPerRole(user.role);
    updateMapPlaceholders(user.location);

    // Enable/disable chat based on login status
    const chatInput = document.getElementById('chatInput');
    const chatSendButton = document.getElementById('chatSendButton');
    if (chatInput) chatInput.disabled = false;
    if (chatSendButton) chatSendButton.disabled = false;

    // Go to home screen by default after login
    switchSection('homeSection');
}

function resetAppToAuth() {
    console.log("Resetting UI to authentication state.");
    detachChatListener();
    detachPreferencesListener();
    toggleVisibility('appSection', 'none');
    toggleVisibility('otpPage', 'none');
    toggleVisibility('authSection', 'block');
    showLoginForm();
    clearAllErrors();
    if (currentTrackingInterval) clearInterval(currentTrackingInterval);
    currentTrackingInterval = null;
    updateAvatarDisplays('avatar-placeholder.png'); // Reset avatars
    document.getElementById('userAvatarSmall').style.display = 'none';


    const chatInput = document.getElementById('chatInput');
    const chatSendButton = document.getElementById('chatSendButton');
    if (chatInput) { chatInput.disabled = true; chatInput.value = ''; }
    if (chatSendButton) chatSendButton.disabled = true;
    setTextHTML('chatMessages', '<p class="placeholder-text">Login to chat.</p>');

}

function toggleVisibility(elementId, displayValue) {
    const element = document.getElementById(elementId);
    if (element) element.style.display = displayValue;
}

function switchSection(sectionId) {
    console.log(`Navigating to section: #${sectionId}`);
    const appContent = document.getElementById('appContent');
    if (!appContent) return;

    const currentActiveSection = appContent.querySelector('.content-section.active-section');
    if (currentActiveSection && currentActiveSection.id === sectionId) return; // Already on this section

    // Detach chat listener if leaving a section that contains chat
    if (currentActiveSection && currentActiveSection.querySelector('#chatSection') &&
        (!document.getElementById(sectionId) || !document.getElementById(sectionId).querySelector('#chatSection'))) {
        detachChatListener();
    }

    appContent.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active-section');
        sec.style.display = 'none'; // Using style directly for hide
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block'; // Show first
        requestAnimationFrame(() => { // Then add class for animation
             targetSection.classList.add('active-section');
        });


        // Specific actions when switching to certain sections
        if (sectionId === 'accountSection') {
            populateAccountInfo(currentUser); // Refresh account info
            if (currentUser?.role === 'admin' && document.getElementById('adminSection')) {
                document.getElementById('adminSection').style.display = 'block';
                loadAllLocalDemoUsers(); // As per "Local List Demo"
            } else if (document.getElementById('adminSection')) {
                 document.getElementById('adminSection').style.display = 'none';
            }
        } else if (document.getElementById('adminSection')) { // Hide admin panel if not in account section
            document.getElementById('adminSection').style.display = 'none';
        }


        if (sectionId === 'orderItemsSection' || sectionId === 'homeSection') {
            updateMapPlaceholders(currentUser?.location);
        }
        if (sectionId === 'orderHistorySection') {
            showOrderHistoryRTDB();
        }

        // Setup chat listener if the new section contains chat
        if (targetSection.querySelector('#chatSection')) {
            setupChatListener();
        }

    } else {
        console.error(`Target section "#${sectionId}" not found! Defaulting to home.`);
        switchSection('homeSection'); // Fallback
        return; // Exit to avoid processing for non-existent section
    }

    // Update bottom nav active state
    document.querySelectorAll('#bottomNav button').forEach(button => {
        button.classList.toggle('active', button.dataset.section === sectionId);
    });

    appContent.scrollTop = 0;
    window.scrollTo(0, 0);
}


function showLoginForm() { toggleAuthForms('loginForm'); document.getElementById('loginEmail')?.focus(); }
function showSignUpForm() { toggleAuthForms('signUpForm'); document.getElementById('signUpEmail')?.focus(); }

function toggleAuthForms(formIdToShow) {
    document.getElementById('signUpForm').style.display = (formIdToShow === 'signUpForm' ? 'block' : 'none');
    document.getElementById('loginForm').style.display = (formIdToShow === 'loginForm' ? 'block' : 'none');
    clearAllErrorsAuth();
    displayStatus('authMessage', '', null);
}

function displayDashboardPerRole(role) {
    const orderPanel = document.getElementById('orderPanel'); // Customer
    const requestPanel = document.getElementById('orderRequestPanel'); // Driver
    const isAdmin = role === 'admin';
    const isCustomer = role === 'customer';
    const isDriver = role === 'driver';

    if (orderPanel) orderPanel.style.display = (isCustomer || isAdmin) ? 'block' : 'none';
    if (requestPanel) requestPanel.style.display = (isDriver || isAdmin) ? 'block' : 'none';

    if (requestPanel && requestPanel.style.display === 'block') {
        // loadDriverRequests(); // Future: Fetch driver-specific requests from Firebase
        setTextHTML('driverRequestsList', '<p class="placeholder-text">(Driver request functionality under development)</p>');
    }
}

function updateMapPlaceholders(location) {
    const locText = location || 'Location Not Set';
    setText('userLocationDisplay', locText);
    setText('userLocationDisplayHome', locText);
    const mapContent = locText !== 'Location Not Set' ? `(Simulated map centered near <strong>${locText}</strong>)` : `(Map Area - Integration Required)`;
    setTextHTML('mapPlaceholder', mapContent);
    setTextHTML('mapPlaceholderSmall', mapContent);
}

function populateAccountInfo(user) {
    if (!user) return;
    setText('accountEmail', user.email);
    setText('accountName', user.displayName || '(Not Set)');
    setText('accountLocation', user.location || 'N/A');
    setText('accountPhone', user.phone || 'N/A');
    setText('userRole', user.role || 'N/A');
    setText('accountUid', user.uid || 'N/A (Local/Demo User)');
    setText('userEmailDisplay', user.displayName || user.email);
    setText('accountType', user.isFirebaseUser ? 'Firebase Secure Account' : 'Local Insecure Demo Account');
    updateAvatarDisplays(user.photoURL);
}

function updateAvatarDisplays(photoURL) {
    const avatarUrl = photoURL && photoURL !== 'avatar-placeholder.png' ? photoURL : 'avatar-placeholder.png';
    const smallAvatar = document.getElementById('userAvatarSmall');
    const largeAvatar = document.getElementById('accountAvatar');

    if (smallAvatar) {
        smallAvatar.src = avatarUrl;
        smallAvatar.style.display = (currentUser && currentUser.isFirebaseUser) ? 'inline-block' : 'none';
    }
    if (largeAvatar) largeAvatar.src = avatarUrl;
}


// --- Authentication Functions ---
async function saveUserProfileToDB(userData) {
    if (!userData || !userData.uid || !userData.isFirebaseUser) {
        console.warn("Cannot save profile: Not a Firebase user or no UID.");
        return;
    }
    const userProfileRef = ref(db, `users/${userData.uid}`);
    const profileData = {
        email: userData.email,
        displayName: userData.displayName || userData.email.split('@')[0],
        role: userData.role || 'customer',
        location: userData.location || 'Not Set',
        phone: userData.phone || 'N/A',
        photoURL: userData.photoURL || null,
        lastLogin: serverTimestamp()
    };
    try {
        await set(userProfileRef, profileData);
        console.log("User profile saved/updated in Firebase RTDB for UID:", userData.uid);
    } catch (error) {
        console.error("Error saving user profile to RTDB:", error);
        displayStatus('authMessage', `Profile save error: ${error.message}`, 'error');
    }
}


function signInWithGoogleFirebase() {
    if (!auth || !googleProvider || !db) {
        console.error("Firebase services not ready for Google Sign-In.");
        displayStatus('authMessage', 'Secure sign-in service unavailable.', 'error');
        return;
    }
    displayStatus('authMessage', 'Redirecting to Google Sign-In...', 'loading');

    signInWithPopup(auth, googleProvider)
      .then(async (result) => {
        const firebaseUser = result.user;
        console.log("Firebase Google Sign-In SUCCESS:", firebaseUser.email);
        // onAuthStateChanged will handle profile fetching/creation and UI update.
        // No need to duplicate logic here.
      })
      .catch((error) => {
        console.error("Firebase Google Sign-In Error:", error);
        let userMessage = `Google Sign-In Error: ${error.message} (Code: ${error.code})`;
        if (error.code === 'auth/popup-closed-by-user') userMessage = 'Sign-in cancelled.';
        if (error.code === 'auth/account-exists-with-different-credential') userMessage = 'Email already in use with a different sign-in method.';
        if (error.code === 'auth/popup-blocked') userMessage = 'Sign-in popup blocked by browser. Please allow popups.';
        displayStatus('authMessage', userMessage, 'error');
      });
}

function logoutFirebase() {
    if (!auth) { console.error("Firebase Auth not ready for logout."); return; }
    const userEmailForLog = currentUser?.email;
    console.log(`Attempting Firebase Sign Out for: ${userEmailForLog || '(unknown)'}`);

    detachChatListener();
    detachPreferencesListener();

    signOut(auth).then(() => {
        console.log("Firebase Sign Out successful.");
        // onAuthStateChanged will trigger handleLogout for Firebase users
    }).catch((error) => {
        console.error("Firebase Sign Out Error:", error);
        alert(`Error during sign out: ${error.message}. You will be logged out locally.`);
    }).finally(() => {
         // Explicitly call handleLogout if current user was Firebase,
         // to ensure cleanup even if onAuthStateChanged is slow or network fails signOut.
         if (currentUser && currentUser.isFirebaseUser) {
            handleLogout();
         } else if (!currentUser) { // If no user was set (edge case)
            resetAppToAuth();
         }
         displayStatus('authMessage', 'You have been successfully logged out.', 'success');
         setTimeout(() => displayStatus('authMessage', '', null), 3500);
    });
}

function handleLogout() {
    console.log("Executing local logout cleanup for user:", currentUser?.email);
    const wasAdmin = currentUser?.role === 'admin';
    currentUser = null;
    localStorage.removeItem('clickngoUser'); // Clear any stored user session

    resetAppToAuth();

    if (wasAdmin && document.getElementById('adminSection')) {
        document.getElementById('adminSection').style.display = 'none';
    }
    // Reset preferences to default (non-user) state.
    loadPreferences(null); // This will apply default theme if user-specific prefs were removed.
}


// --- INSECURE LOCAL AUTH DEMO FUNCTIONS (DO NOT USE IN PRODUCTION) ---
function handleLocalSignUp(event) {
    event.preventDefault();
    console.warn("--- INITIATING INSECURE LOCAL SIGNUP (DEMO ONLY) ---");
    clearAllErrorsAuth();

    const emailInput = document.getElementById('signUpEmail');
    const passwordInput = document.getElementById('signUpPassword');
    const locationInput = document.getElementById('signUpLocation');
    const phoneInput = document.getElementById('signUpPhone');
    const roleSelect = document.getElementById('signUpRole');

    let isValid = validateInput(emailInput, { isEmail: true }) &&
                  validateInput(passwordInput, { minLength: 6 }) &&
                  validateInput(locationInput) &&
                  validateInput(phoneInput, { isPhone: true }) &&
                  validateInput(roleSelect);

    if (!isValid) {
        displayStatus('authMessage', 'Please fix errors in the form.', 'error');
        return;
    }
    const email = emailInput.value.trim();
    // Extremely Insecure: Check if local email exists
    const localUsers = JSON.parse(localStorage.getItem('clickngoUsersDemoList') || '[]');
    if (localUsers.some(user => user.email === email)) {
        displayError(document.getElementById('signUpEmailError'), 'Email already registered in local demo.');
        emailInput.classList.add('error');
        isValid = false;
    }
    if (!isValid) return;

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // DEMO OTP
    sessionStorage.setItem('signUpDataDemo', JSON.stringify({
        email, password: passwordInput.value, // STORING RAW PASSWORD - VERY BAD!
        location: locationInput.value.trim(),
        phone: phoneInput.value.trim(),
        role: roleSelect.value,
        otp
    }));

    console.warn(`******************************************************************`);
    console.warn(`* INSECURE DEMO OTP for ${email}: ${otp} (Normally sent securely) *`);
    console.warn(`******************************************************************`);
    setText('otpMessage', `Enter the 6-digit DEMO OTP for ${email} (Check browser console).`);
    toggleVisibility('authSection', 'none');
    toggleVisibility('otpPage', 'block');
    document.getElementById('otpInput')?.focus();
}

function handleLocalOtpVerify() {
    console.warn("--- INSECURE LOCAL OTP VERIFICATION (DEMO ONLY) ---");
    clearAllErrors(['otpError', 'otpStatus']);
    const otpInput = document.getElementById('otpInput');

    if (!validateInput(otpInput, { exactLength: 6, isNumeric: true })) return;

    const storedDataString = sessionStorage.getItem('signUpDataDemo');
    if (!storedDataString) {
        displayError('otpError', "Demo session expired. Please sign up again.");
        setTimeout(resetAppToAuth, 3000); return;
    }
    const signUpData = JSON.parse(storedDataString);

    if (otpInput.value.trim() === signUpData.otp) {
        displayStatus('otpStatus', 'Demo OTP correct! Creating insecure local account...', 'loading');
        setTimeout(() => {
            const newUser = {
                email: signUpData.email,
                password: signUpData.password, // WARNING: PLAINTEXT PASSWORD
                location: signUpData.location,
                phone: signUpData.phone,
                role: signUpData.role,
                uid: `local_demo_${Date.now()}`, // Simple unique ID for demo
                isFirebaseUser: false,
                displayName: signUpData.email.split('@')[0],
                photoURL: 'avatar-placeholder.png' // Default avatar for local users
            };
            let localUsers = JSON.parse(localStorage.getItem('clickngoUsersDemoList') || '[]');
            localUsers.push(newUser);
            localStorage.setItem('clickngoUsersDemoList', JSON.stringify(localUsers));
            sessionStorage.removeItem('signUpDataDemo');

            currentUser = newUser;
            localStorage.setItem('clickngoUser', JSON.stringify(currentUser)); // Current insecure session
            displayStatus('otpStatus', 'Insecure local account created! Loading app...', 'success');
            setTimeout(() => {
                updateUIForUser(currentUser); // Use the general UI updater
                loadPreferences(null); // Apply default or generic theme
            }, 1000);
        }, 1000);
    } else {
        displayError('otpError', "Incorrect demo OTP.");
        otpInput.value = '';
        otpInput.focus();
        displayStatus('otpStatus', '', null);
    }
}

function handleLocalLogin(event) {
    event.preventDefault();
    console.warn("--- ATTEMPTING INSECURE LOCAL LOGIN (DEMO ONLY) ---");
    clearAllErrorsAuth();
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const generalErrorEl = document.getElementById('loginError');

    if (!validateInput(emailInput, { isEmail: true }) || !validateInput(passwordInput)) {
        displayError(generalErrorEl, 'Valid email and password required for demo login.');
        return;
    }
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    displayStatus('authMessage', 'Checking demo credentials...', 'loading');

    setTimeout(() => {
        const localUsers = JSON.parse(localStorage.getItem('clickngoUsersDemoList') || '[]');
        const foundUser = localUsers.find(user => user.email === email && user.password === password && !user.isFirebaseUser); // Check plaintext password!

        if (foundUser) {
            console.log(`INSECURE local login success for: ${email}`);
            currentUser = foundUser;
            localStorage.setItem('clickngoUser', JSON.stringify(currentUser));
            displayStatus('authMessage', 'Demo login successful! Loading...', 'success');
            setTimeout(() => {
                 updateUIForUser(currentUser);
                 loadPreferences(null); // Apply default or generic theme for local user
            }, 800);
        } else {
            displayError(generalErrorEl, 'Invalid email/password for local demo account.');
            displayStatus('authMessage', '', null);
            passwordInput.value = '';
            passwordInput.focus();
        }
    }, 700);
}
// --- END OF INSECURE LOCAL AUTH DEMO ---


// --- User Profile & Admin ---
function loadAllLocalDemoUsers() { // Renamed for clarity
    console.warn("Admin Panel: Loading users from INSECURE local storage demo list...");
    const displayArea = document.getElementById('allUsers');
    if (!displayArea) return;
    displayArea.innerHTML = '<div class="loading-message loading">Loading local demo user list...</div>';

    setTimeout(() => {
        const localUsers = JSON.parse(localStorage.getItem('clickngoUsersDemoList') || '[]');
        if (localUsers.length === 0) {
            displayArea.innerHTML = '<p class="placeholder-text">No users found in the local (insecure demo) storage.</p>';
            return;
        }
        const userListUl = document.createElement('ul');
        userListUl.className = 'user-list-items';
        localUsers.forEach(user => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>Email:</strong> ${user.email || '?'} (Role: ${user.role || '?'})<br>
                <strong>Name:</strong> ${user.displayName || '(Not set)'} | <strong>Loc:</strong> ${user.location || '?'}<br>
                <small>UID: ${user.uid} <span class="status-highlight status-cancelled">Local (Insecure)</span></small>`;
            userListUl.appendChild(li);
        });
        displayArea.innerHTML = '';
        displayArea.appendChild(userListUl);
    }, 300);
}

async function deleteAccountHandler() {
    if (!currentUser) { alert("Not logged in."); return; }
    const { email, uid, isFirebaseUser } = currentUser;
    if (!confirm(`ARE YOU SURE?\nThis will permanently delete account: ${email}.\nThis action cannot be undone.`)) return;

    displayStatus('authMessage', 'Deleting account...', 'loading');

    if (isFirebaseUser && auth.currentUser && auth.currentUser.uid === uid) {
        try {
            // Delete Firebase Auth user
            await deleteUser(auth.currentUser);
            console.log("Firebase Auth user deleted.");

            // Delete user data from RTDB (profile, preferences, their orders, their feedback, etc.)
            // This is simplified. A robust solution would use Cloud Functions.
            await set(ref(db, `users/${uid}`), null);
            await set(ref(db, `user-preferences/${uid}`), null);
            // Potentially remove from `orders` and `user-orders/${uid}` too. More complex query/delete needed.
            // For now, this covers primary profile and preferences.

            alert('Your Firebase account and associated data have been deleted.');
            // handleLogout() will be triggered by onAuthStateChanged
        } catch (error) {
            console.error("Firebase account deletion error:", error);
            if (error.code === 'auth/requires-recent-login') {
                alert("Sensitive operation. Please sign out, sign back in, then try deleting again immediately.");
            } else {
                alert(`Error deleting account: ${error.message}`);
            }
            displayStatus('authMessage', '', null);
        }
    } else if (!isFirebaseUser) { // Insecure local demo user
        let localUsers = JSON.parse(localStorage.getItem('clickngoUsersDemoList') || '[]');
        const updatedLocalUsers = localUsers.filter(user => user.uid !== uid);
        if (localUsers.length > updatedLocalUsers.length) {
            localStorage.setItem('clickngoUsersDemoList', JSON.stringify(updatedLocalUsers));
            console.log("Insecure local demo user removed.");
        }
        alert('Local demo account data removed from this browser.');
        handleLogout(); // Manually trigger logout for local users
        displayStatus('authMessage', '', null);
    } else {
        alert("Account type mismatch or error. Please re-login and try again.");
        displayStatus('authMessage', '', null);
        if (isFirebaseUser) logoutFirebase(); else handleLogout();
    }
}

function promptUserForRole(name){
    let role = prompt(`Welcome ${name || 'User'}! What is your role? (customer, driver, admin)`, "customer");
    role = role ? role.trim().toLowerCase() : 'customer';
    return ['customer', 'driver', 'admin'].includes(role) ? role : 'customer';
}
function promptUserForLocation(){
    const location = prompt("Please enter your primary city or area:", "");
    return location ? location.trim() : "Not Set";
}
function promptUserForPhone(){
    const phone = prompt("Please enter your phone number (optional):", "");
    return phone ? phone.trim() : "N/A";
}

// --- Firebase RTDB Feature Functions ---
async function simulateOrderRTDB() {
    if (!currentUser || !currentUser.uid) { alert("Please log in (Securely) to place an order."); return; }
    console.log(`Simulating RTDB order for: ${currentUser.email}`);
    const orderId = `CNG-${Date.now().toString().slice(-7)}_${Math.random().toString(36).substring(2, 6)}`;
    const newOrder = {
        orderId,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.displayName,
        date: new Date().toLocaleString(),
        items: "Simulated Package Delivery (Firebase RTDB)",
        status: "Pending",
        location: currentUser.location || 'Unknown Location',
        timestamp: serverTimestamp() // Use Firebase server time
    };
    try {
        await set(ref(db, `orders/${orderId}`), newOrder);
        await set(ref(db, `user-orders/${currentUser.uid}/${orderId}`), true); // Index for user's orders
        alert(`Simulated Order (#${orderId}) Placed in Firebase RTDB!\nCheck 'Order History'.`);
        showOrderHistoryRTDB(); // Refresh view
        updateTrackingRTDB(orderId); // Start tracking simulation
        switchSection('orderItemsSection'); // Navigate to tracking if not there
    } catch (error) {
        console.error("Error simulating RTDB order:", error);
        alert("Error placing simulated RTDB order: " + error.message);
    }
}

async function showOrderHistoryRTDB() {
    const orderListElement = document.getElementById('orderList');
    if (!orderListElement) return;
    if (!currentUser || !currentUser.uid) {
        orderListElement.innerHTML = '<p class="placeholder-text">Please log in (Securely) to view order history.</p>';
        return;
    }
    orderListElement.innerHTML = '<div class="loading-message loading">Loading order history from Firebase...</div>';

    try {
        const userOrdersRef = query(ref(db, 'orders'), orderByChild('userId'), equalTo(currentUser.uid));
        const snapshot = await get(userOrdersRef);

        if (!snapshot.exists() || snapshot.numChildren() === 0) {
            orderListElement.innerHTML = '<p class="placeholder-text">No order history found in Firebase.</p>';
            return;
        }
        const userOrders = [];
        snapshot.forEach(childSnapshot => {
            userOrders.push({ ...childSnapshot.val(), orderId: childSnapshot.key });
        });
        userOrders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Sort client-side if RTDB timestamp isn't epoch or sorting is complex

        orderListElement.innerHTML = '';
        userOrders.forEach(order => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'order-history-item card';
            const statusClass = `status-${(order.status || '?').toLowerCase().replace(/\s+/g, '-')}`;
            itemDiv.innerHTML = `
                <h4>Order #${order.orderId}</h4>
                <p><strong>Date:</strong> ${order.date || new Date(order.timestamp || 0).toLocaleString()}</p>
                <p><strong>Items:</strong> ${order.items || '?'}</p>
                <p><strong>Status:</strong> <span class="status-highlight ${statusClass}">${order.status || '?'}</span></p>
                ${currentUser.role === 'admin' ? `<hr><p><small>User: ${order.userEmail || order.userId || '?'} (${order.location || '?'})</small></p>` : ''}
            `;
            orderListElement.appendChild(itemDiv);
        });
    } catch (error) {
        console.error("Error fetching order history from RTDB:", error);
        orderListElement.innerHTML = '<p class="error-message">Failed to load order history from Firebase.</p>';
    }
}

function updateTrackingRTDB(orderId) {
    const trackingPanel = document.getElementById('trackingPanel');
    if (!trackingPanel) return;
    if (currentTrackingInterval) clearInterval(currentTrackingInterval);

    if (!orderId) {
        trackingPanel.innerHTML = '<p class="placeholder-text">Place an order to see tracking.</p>';
        return;
    }
    trackingPanel.innerHTML = '<div class="loading-message loading">Loading tracking info...</div>';

    const orderRef = ref(db, `orders/${orderId}`);
    get(orderRef).then(snapshot => {
        if (!snapshot.exists()) {
            trackingPanel.innerHTML = `<p class="error-message">Order #${orderId} not found.</p>`;
            return;
        }
        const order = snapshot.val();
        trackingPanel.innerHTML = `
            <h4>Tracking Order: ${order.orderId} (Firebase RTDB)</h4>
            <p id="trackingStatusDisplay">Current Status: ...</p>
            <div id="trackingProgressBar" class="progress-bar-container" aria-hidden="true">
                <div class="progress-bar-fill" style="width:0%;"></div>
            </div>`;

        const statusDisplay = document.getElementById('trackingStatusDisplay');
        const progressBarFill = trackingPanel.querySelector('.progress-bar-fill');
        const stages = ["Pending", "Driver Assigned", "Picking Up", "On the Way", "Delivered", "Cancelled"];
        let currentStageIndex = stages.indexOf(order.status);
        if (currentStageIndex < 0) currentStageIndex = 0;

        const updateDisplay = (index) => {
            const stageName = stages[index];
            const isFinished = index >= stages.indexOf("Delivered");
            const isCancelled = stageName === "Cancelled";
            const statusClass = `status-${stageName.toLowerCase().replace(/\s+/g, '-')}`;
            statusDisplay.innerHTML = `Current Status: <strong class="status-highlight ${statusClass}">${stageName}${(!isFinished && !isCancelled) ? '...' : ''}</strong>`;
            const progressPercent = isCancelled ? 0 : ((index + 1) / (stages.indexOf("Delivered") + 1)) * 100;
            progressBarFill.style.width = `${Math.min(100, Math.max(0, progressPercent))}%`;
            progressBarFill.style.backgroundColor = isCancelled ? 'var(--danger-red)' : (isFinished ? 'var(--primary-green)' : 'var(--link-blue)');
        };
        updateDisplay(currentStageIndex);

        if (currentStageIndex >= stages.indexOf("Delivered")) return; // Stop if already final

        currentTrackingInterval = setInterval(async () => {
            currentStageIndex++;
            updateDisplay(currentStageIndex);
            try {
                await set(ref(db, `orders/${orderId}/status`), stages[currentStageIndex]);
                await set(ref(db, `orders/${orderId}/timestamp`), serverTimestamp()); // Update timestamp on status change
            } catch (e) { console.error("Error updating simulated order status in RTDB:", e); }

            if (currentStageIndex >= stages.indexOf("Delivered")) {
                clearInterval(currentTrackingInterval);
                currentTrackingInterval = null;
                if (document.getElementById('orderHistorySection')?.classList.contains('active-section')) {
                    showOrderHistoryRTDB();
                }
            }
        }, 4500 + Math.random() * 2000);
    }).catch(error => {
        console.error("Error fetching order for tracking:", error);
        trackingPanel.innerHTML = `<p class="error-message">Error loading tracking for #${orderId}.</p>`;
    });
}


// Realtime Chat Functions
function setupChatListener() {
    if (!db || !chatMessagesRef) { console.error("Chat: DB/Ref not ready."); return; }
    if (!currentUser || !currentUser.uid) {
        setTextHTML('chatMessages', '<p class="placeholder-text error-message">Please log in to use chat.</p>');
        return;
    }
    if (chatListenerUnsubscribe) { console.log("Chat listener already active."); return; }

    console.log("%cSetting up Firebase RTDB chat listener...", "color: blue; font-weight: bold;");
    const messagesDiv = document.getElementById('chatMessages');
    messagesDiv.innerHTML = '<div class="loading-message loading">Connecting to chat...</div>';

    // Query to get latest N messages, ordered by timestamp
    const chatQuery = query(chatMessagesRef, orderByChild('timestamp')); // Potentially add limitToLast(50)

    chatListenerUnsubscribe = onValue(chatQuery, (snapshot) => {
        console.log("%cChat: onValue triggered.", "color: green;");
        const currentMessagesDiv = document.getElementById('chatMessages'); // Re-fetch, section might have changed
        if (!currentMessagesDiv || !currentUser || !currentUser.uid) { // Safety check
            detachChatListener(); return;
        }
        currentMessagesDiv.innerHTML = ''; // Clear before re-render

        if (!snapshot.exists() || !snapshot.hasChildren()) {
            currentMessagesDiv.innerHTML = '<p class="placeholder-text"><i>No messages yet. Start the conversation!</i></p>';
            return;
        }
        snapshot.forEach(childSnapshot => {
            const messageData = childSnapshot.val();
            if (!messageData || typeof messageData.text !== 'string' || !messageData.text.trim() || typeof messageData.senderUid !== 'string') {
                console.warn("Chat: Skipping invalid message data", messageData);
                return;
            }

            const messageContainer = document.createElement('div');
            messageContainer.classList.add('message-container');

            const avatarImg = document.createElement('img');
            avatarImg.classList.add('chat-avatar');
            avatarImg.src = messageData.senderPhotoURL || 'avatar-placeholder.png';
            avatarImg.alt = messageData.senderName ? messageData.senderName.substring(0,1) : 'U';


            const messageElement = document.createElement('div');
            messageElement.classList.add('message');

            if (messageData.senderUid === currentUser.uid) {
                messageContainer.classList.add('own');
                messageElement.classList.add('own');
                messageElement.textContent = messageData.text; // Own messages, simple text
            } else {
                messageContainer.classList.add('incoming');
                messageElement.classList.add('incoming');
                const senderStrong = document.createElement('strong');
                senderStrong.textContent = messageData.senderName || 'Guest';
                messageElement.appendChild(senderStrong);
                messageElement.appendChild(document.createTextNode(': ' + messageData.text));
            }
             // Add avatar based on message sender
            if (messageData.senderUid === currentUser.uid) {
                messageContainer.appendChild(messageElement); // Bubble first
                messageContainer.appendChild(avatarImg);      // Then avatar
            } else {
                messageContainer.appendChild(avatarImg);      // Avatar first
                messageContainer.appendChild(messageElement); // Then bubble
            }


            if (typeof messageData.timestamp === 'number') {
                const tsSpan = document.createElement('span');
                tsSpan.classList.add('message-timestamp');
                tsSpan.textContent = new Date(messageData.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                messageElement.appendChild(tsSpan);
            }
            currentMessagesDiv.appendChild(messageContainer);
        });
        currentMessagesDiv.scrollTop = currentMessagesDiv.scrollHeight; // Auto-scroll to bottom
    }, (error) => {
        console.error("%cChat: RTDB Listener Error:", "color: red;", error);
        setTextHTML('chatMessages', `<p class="error-message">Error loading chat: ${error.message}. Check DB Rules & Connection.</p>`);
        detachChatListener();
    });
}

function detachChatListener() {
    if (chatListenerUnsubscribe) {
        console.log("%c<<<< Detaching Firebase Chat Listener >>>>", "color: orange;");
        chatListenerUnsubscribe();
        chatListenerUnsubscribe = null;
    }
}

function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const messageText = chatInput.value.trim();
    if (!currentUser || !currentUser.uid || !currentUser.displayName) {
        alert("You must be fully logged in to send messages."); return;
    }
    if (!db || !chatMessagesRef) { alert("Chat service unavailable."); return; }
    if (!messageText) return;

    const sendButton = document.getElementById('chatSendButton');
    chatInput.disabled = true;
    if (sendButton) sendButton.disabled = true;
    displayStatus('chatStatus', 'Sending...', 'loading');

    const messageData = {
        text: messageText, // Basic sanitization should be done server-side with rules or cloud functions if complex HTML is ever allowed.
        senderUid: currentUser.uid,
        senderName: currentUser.displayName,
        senderPhotoURL: currentUser.photoURL || 'avatar-placeholder.png',
        timestamp: serverTimestamp()
    };
    const newMessageRef = push(chatMessagesRef);
    set(newMessageRef, messageData)
        .then(() => { chatInput.value = ''; }) // onValue listener will display it
        .catch((error) => {
            console.error("Error sending message:", error);
            alert(`Failed to send: ${error.message}`);
            displayStatus('chatStatus', 'Send failed.', 'error');
        })
        .finally(() => {
            chatInput.disabled = false;
            if (sendButton) sendButton.disabled = false;
            chatInput.focus();
            setTimeout(() => displayStatus('chatStatus', '', null), 1500);
        });
}

// Feedback (RTDB)
async function submitFeedbackRTDB(event) {
    event.preventDefault();
    if (!currentUser || !currentUser.uid) { alert("Log in (Securely) to send feedback."); return; }
    const messageTextarea = document.getElementById('feedbackMessage');
    const statusElement = document.getElementById('feedbackStatus');
    if (!validateInput(messageTextarea, { minLength: 10 })) return;

    const message = messageTextarea.value.trim();
    displayStatus(statusElement, 'Submitting feedback to Firebase...', 'loading');
    messageTextarea.disabled = true;
    event.target.querySelector('button[type="submit"]').disabled = true;

    try {
        const feedbackRef = push(ref(db, 'feedback'));
        await set(feedbackRef, {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            userName: currentUser.displayName,
            message: message,
            timestamp: serverTimestamp(),
            userAgent: navigator.userAgent
        });
        displayStatus(statusElement, 'Feedback submitted to Firebase! Thank you.', 'success');
        messageTextarea.value = '';
        setTimeout(() => displayStatus(statusElement, '', null), 3000);
    } catch (error) {
        console.error("Error submitting feedback to RTDB:", error);
        displayStatus(statusElement, 'Error submitting feedback: ' + error.message, 'error');
    } finally {
        messageTextarea.disabled = false;
        event.target.querySelector('button[type="submit"]').disabled = false;
    }
}


// Preferences (RTDB for Firebase users, localStorage for local demo)
function loadUserPreferences(uid) {
    if (preferencesListenerUnsubscribe) detachPreferencesListener(); // Detach previous before attaching new

    if (uid && db) { // Firebase user
        preferencesRef = ref(db, `user-preferences/${uid}`);
        console.log(`%cSetting up preferences listener for UID: ${uid}`, "color: purple;");
        preferencesListenerUnsubscribe = onValue(preferencesRef, (snapshot) => {
            const prefs = snapshot.val() || {}; // Default to empty object if no prefs found
            console.log("Firebase Preferences loaded for user:", prefs);
            applyPreferences(prefs);
        }, (error) => {
            console.error(`Error loading Firebase preferences for ${uid}:`, error);
            applyPreferences({}); // Apply default if Firebase read fails
        });
    } else { // Local demo user or no user logged in
        loadPreferences(null); // From localStorage
    }
}

function loadPreferences(prefsFromLSOnly = null) { // General function, can take direct LS prefs or load itself
    let prefs = {};
    if (prefsFromLSOnly !== null) { // Specific call for LS
        prefs = prefsFromLSOnly;
    } else { // General call (DOMContentLoaded or local user), try LS
        try {
            const prefsString = localStorage.getItem('appUserPreferences'); // Generic key for non-Firebase
            prefs = prefsString ? JSON.parse(prefsString) : {};
            console.log("LocalStorage Preferences loaded:", prefs);
        } catch (error) {
            console.error("Failed to parse LocalStorage preferences:", error);
            prefs = {};
        }
    }
    applyPreferences(prefs);
}


function applyPreferences(prefs) {
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect && prefs.language) {
        languageSelect.value = prefs.language;
    }
    const theme = prefs.theme || 'light'; // Default to light
    const darkModeToggle = document.getElementById('darkModeToggle');
    document.body.classList.toggle('dark-mode', theme === 'dark');
    if (darkModeToggle) darkModeToggle.checked = (theme === 'dark');
}

function detachPreferencesListener() {
    if (preferencesListenerUnsubscribe) {
        console.log("%cDetaching Firebase Preferences Listener", "color: purple;");
        preferencesListenerUnsubscribe(); // Call the off() function returned by onValue
        preferencesListenerUnsubscribe = null;
        preferencesRef = null;
    }
}


async function saveUserPreferencesToDB() {
    const statusElement = document.getElementById('userPreferencesStatus');
    if (!statusElement) return;

    const language = document.getElementById('languageSelect')?.value || 'en';
    const theme = document.getElementById('darkModeToggle')?.checked ? 'dark' : 'light';
    const prefs = { language, theme, lastUpdated: serverTimestamp() };

    if (currentUser && currentUser.isFirebaseUser && currentUser.uid && db) { // Firebase User
        displayStatus(statusElement, 'Saving preferences to Firebase...', 'loading');
        try {
            await set(ref(db, `user-preferences/${currentUser.uid}`), prefs);
            displayStatus(statusElement, 'Preferences saved to Firebase!', 'success');
        } catch (error) {
            console.error("Failed to save Firebase preferences:", error);
            displayStatus(statusElement, 'Error saving to Firebase: ' + error.message, 'error');
        }
    } else { // Local demo user or not logged in - save to localStorage
        displayStatus(statusElement, 'Saving preferences locally...', 'loading');
        try {
            localStorage.setItem('appUserPreferences', JSON.stringify({ language, theme }));
             displayStatus(statusElement, 'Preferences saved locally!', 'success');
        } catch (error) {
             console.error("Failed to save LocalStorage preferences:", error);
             displayStatus(statusElement, 'Error saving preferences locally.', 'error');
        }
    }
    applyPreferences(prefs); // Apply immediately
    setTimeout(() => displayStatus(statusElement, '', null), 2500);
}


function toggleDarkModeHandler() { // Only toggles, savePreferences handles persistence
    const isDark = document.body.classList.toggle('dark-mode');
    document.getElementById('darkModeToggle').checked = isDark;
    // Trigger save which now handles both Firebase and LS based on user type
    saveUserPreferencesToDB();
}


// Utility Functions
function loadFaq() {
    const faqListElement = document.getElementById('faqList');
    if (!faqListElement) return;
    faqListElement.innerHTML = '';
    const faqs = [
        { q: "What services does Click n' Go offer?", a: "We provide 12-hour motor-taxi rides and on-demand delivery services (food, packages, etc.) in Boac, Marinduque." },
        { q: "How do I book a service?", a: "Currently, bookings are via Direct Messages on our Facebook page. In-app booking (Firebase powered) is coming soon!" },
        { q: "What are your operating hours?", a: "Typically 12 hours daily. Check our Facebook page for current hours." },
        { q: "Data Security?", a: "Use 'Sign in with Google' for secure data handling via Firebase. The local email/password signup is an **INSECURE DEMO** and should NOT be used for real accounts." }
    ];
    if (faqs.length === 0) {
        faqListElement.innerHTML = '<p class="placeholder-text">No FAQs available currently.</p>'; return;
    }
    faqs.forEach(faq => {
        const item = document.createElement('div');
        item.className = 'faq-item';
        item.innerHTML = `<p class="faq-question"><strong>Q:</strong> ${faq.q}</p><p class="faq-answer"><strong>A:</strong> ${faq.a}</p>`;
        faqListElement.appendChild(item);
    });
}

function setText(elementId, text, defaultValue = "...") {
    const element = document.getElementById(elementId);
    if (element) element.textContent = text || defaultValue;
}
function setTextHTML(elementId, html, defaultValue = "") {
    const element = document.getElementById(elementId);
    if (element) element.innerHTML = html || defaultValue; // Use with trusted HTML only
}

function updateClock() {
    const timeEl = document.getElementById('clockTime');
    const dateEl = document.getElementById('clockDate');
    const now = new Date();
    if (timeEl) timeEl.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    if (dateEl) dateEl.innerText = now.toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function displayWelcomeMessage() {
    const el = document.getElementById('welcomeMessage');
    if (!el) return;
    const h = new Date().getHours();
    el.innerText = (h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening") + "!";
}

function validateInput(inputEl, opts = {}) {
    if (!inputEl) return false;
    const val = inputEl.value.trim();
    const errEl = document.getElementById(inputEl.id + 'Error');
    let msg = '';

    if (inputEl.required && val === '') msg = 'This field is required.';
    else if (opts.minLength && val.length < opts.minLength) msg = `Min ${opts.minLength} characters.`;
    else if (opts.exactLength && val.length !== opts.exactLength) msg = `Must be ${opts.exactLength} characters.`;
    else if (opts.isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) msg = 'Invalid email address.';
    else if (opts.isPhone && !/^\+?[\d\s-]{7,20}$/.test(val)) msg = 'Invalid phone number.';
    else if (opts.isNumeric && !/^\d+$/.test(val)) msg = 'Numbers only.';

    if (errEl) displayError(errEl, msg);
    inputEl.classList.toggle('error', !!msg);
    return !msg;
}

function displayStatus(elementOrId, message, type = null) {
    const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!el) return;
    el.textContent = message || '';
    el.className = 'status-message'; // Reset
    if (type) el.classList.add(type); // 'loading', 'success', 'error'
}

function displayError(elementOrId, message) {
    const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!el) return;
    el.textContent = message || '';
    el.style.display = message ? 'block' : 'none';
}

function clearAllErrorsAuth() { // Specific for auth section errors
    ['signUpEmailError', 'signUpPasswordError', 'signUpLocationError', 'signUpPhoneError', 'signUpRoleError', 'loginEmailError', 'loginPasswordError', 'loginError', 'otpError', 'otpStatus', 'authMessage']
    .forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '';
            if (el.classList.contains('error-message')) el.style.display = 'none';
            else if (el.classList.contains('status-message')) el.className = 'status-message';
        }
    });
    document.querySelectorAll('#authSection input.error, #otpPage input.error').forEach(el => el.classList.remove('error'));
}

function clearAllErrors() { // General error clearer
    document.querySelectorAll('.error-message').forEach(el => { el.textContent = ''; el.style.display = 'none'; });
    document.querySelectorAll('input.error, select.error, textarea.error').forEach(el => el.classList.remove('error'));
    // Clear general status messages that might hold errors
    ['authMessage', 'otpStatus', 'feedbackStatus', 'userPreferencesStatus', 'loginError', 'chatStatus'].forEach(id => displayStatus(id, ''));
}
