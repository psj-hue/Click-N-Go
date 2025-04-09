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
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getDatabase,
    ref,
    push,
    set,
    onValue,
    off,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ---=== YOUR FIREBASE CONFIGURATION ===---
// Replace placeholders below if necessary, but use the values from your Firebase Console Project Settings
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

// Initialize Firebase Globals
let app;
let analytics;
let auth;
let googleProvider;
let db; // Database instance
let chatMessagesRef; // Reference to chat messages location
let chatListenerUnsubscribe = null; // To hold the listener detach function

try {
    app = initializeApp(firebaseConfig);
    if (firebaseConfig.measurementId && firebaseConfig.measurementId.startsWith('G-')) {
        analytics = getAnalytics(app);
    } else {
        console.warn("Firebase Analytics not initialized: measurementId missing/invalid.");
    }
    auth = getAuth(app);
    db = getDatabase(app); // Initialize Realtime Database
    chatMessagesRef = ref(db, 'chats/mainRoom'); // Define chat reference path
    googleProvider = new GoogleAuthProvider();
    console.log("Firebase Initialized Successfully (including Realtime Database).");
} catch (error) {
    console.error("FATAL: Firebase Initialization Failed:", error);
    alert("Critical Error: Could not initialize required services.");
    document.body.innerHTML = `<div style='padding: 30px; text-align: center; color: red;'><h2>Initialization Error</h2><p>Could not connect to critical services. Please check the console log or contact support.</p></div>`;
    throw new Error("Firebase Initialization Failed - Application cannot continue.");
}

// --- SECURITY WARNINGS --- //
// 1. Local Storage for user profile data (role, location, phone) is NOT secure or synced. Migrate to Firestore/RTDB with Security Rules.
// 2. Local Email/Password system is INSECURE (plaintext password storage). Migrate fully to Firebase Auth methods.
// 3. Firebase Security Rules MUST be configured for Realtime Database AND Auth to protect your data. SET THEM UP NOW in the Firebase Console.
// ------------------------ //

// --- Global Variables ---
let currentUser = null;

// --- Initialization & Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    if (!auth || !db) {
        console.error("Firebase Auth or Database instance is not available. App may be broken.");
        return;
    }
    initializeAuthenticationState();
    attachEventListeners();
    loadStaticData();
    startTimers();
});

function initializeAuthenticationState() {
    const storedUser = localStorage.getItem('clickngoUser');
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            console.log("Restored user session from localStorage:", currentUser?.email);
            updateUIForSignedInUser(currentUser);
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
            // User is signed in according to Firebase.
            // Check if our local state matches. If not, maybe sync/update.
            if (!currentUser || currentUser.uid !== firebaseUser.uid) {
                console.warn("Firebase auth state changed to signed in, but local state mismatch or absent. Re-fetch/re-init might be needed if auto-login desired, or user needs manual Google Sign-in via button.");
                // For this app's flow, we rely on explicit login actions (button click)
                // If currentUser IS set and matches, we assume everything is fine.
                if(currentUser && currentUser.uid === firebaseUser.uid){
                     console.log("Firebase onAuthStateChanged confirms current user is valid:", firebaseUser.email);
                 }
            }
        } else {
            // User is signed out according to Firebase.
            // If our local state *still* thinks a user is logged in, force clean up.
            if (currentUser) {
                console.warn("Firebase auth state changed to signed out, but local state has a user. Forcing local cleanup.");
                logoutFirebase(); // Trigger the full logout process
            }
        }
    });
}


function attachEventListeners() {
    console.log("Attaching event listeners...");
    // Forms
    document.getElementById('loginFormElem')?.addEventListener('submit', login);
    document.getElementById('signupFormElem')?.addEventListener('submit', signUp);
    document.getElementById('feedbackForm')?.addEventListener('submit', submitFeedback);

    // --- Chat Send Button Listener ---
    // (Make sure your HTML button has id="chatSendButton")
    document.getElementById('chatSendButton')?.addEventListener('click', sendMessage);

    // Expose functions to global scope for HTML onclick attributes (use sparingly)
    window.showLoginForm = showLoginForm;
    window.showSignUpForm = showSignUpForm;
    window.verifyOTP = verifyOTP;           // Used by insecure local signup
    window.clearInput = clearInput;
    window.switchSection = switchSection;   // Main navigation
    window.logoutFirebase = logoutFirebase;
    window.deleteAccount = deleteAccount;
    window.toggleDarkMode = toggleDarkMode;
    window.savePreferences = savePreferences; // Settings save handler
    window.simulateOrder = simulateOrder;   // Demo feature
    window.showOrderHistory = showOrderHistory;
    window.signInWithGoogleFirebase = signInWithGoogleFirebase; // Google Sign-in
    // Note: Removed `window.sendMessage` - use the event listener instead.
}


function loadStaticData() {
    console.log("Loading static data (FAQ, Preferences)...");
    loadFaq();
    loadPreferences();
}

function startTimers() {
    console.log("Starting timers (Clock)...");
    updateClock();
    displayWelcomeMessage();
    setInterval(updateClock, 1000);
}

// --- UI Management Functions ---

function updateUIForSignedInUser(user) {
    if (!user || !user.email) {
        console.warn("updateUIForSignedInUser: invalid user object.", user);
        resetToAuthState();
        return;
    }
    console.log("Updating UI for signed-in user:", user.email);
    toggleVisibility('authSection', 'appSection');
    toggleVisibility('otpPage', null);

    populateAccountInfo(user);
    displayDashboard(user.role);
    updateMap();
    loadPreferences();

    switchSection('homeSection'); // Default to home
}

function resetToAuthState() {
    console.log("Resetting UI to authentication state.");
    // *** Detach chat listener before hiding app section ***
    detachChatListener();
    toggleVisibility('appSection', 'authSection');
    toggleVisibility('otpPage', null);
    showLoginForm();
}

function toggleVisibility(hideId, showId) {
    const hideEl = document.getElementById(hideId);
    if (hideEl) hideEl.style.display = 'none';
    if (showId) {
         const showEl = document.getElementById(showId);
         if (showEl) showEl.style.display = 'block';
         else console.error(`Element to show not found: #${showId}`);
    }
}

/** Switches content sections & handles chat listener lifecycle */
function switchSection(sectionId) {
    console.log(`Navigating to section: #${sectionId}`);

    // *** Detach listener BEFORE hiding sections ***
    if (chatListenerUnsubscribe) {
        console.log("Detaching chat listener because of section switch.");
        detachChatListener(); // Call detach function
    }

    // Hide all main content sections
    document.querySelectorAll('#appSection > main > .content-section').forEach(sec => {
        sec.style.display = 'none';
    });

    // Handle Admin panel visibility (nested in account section)
    const adminPanel = document.getElementById('adminSection');
    if (adminPanel) {
        const showAdminPanel = (sectionId === 'accountSection' && currentUser?.role === 'admin');
        adminPanel.style.display = showAdminPanel ? 'block' : 'none';
        if (showAdminPanel) loadAllUsers();
    }

    // Show the target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
    } else {
        console.error(`Target section "#${sectionId}" not found! Defaulting home.`);
        const homeSection = document.getElementById('homeSection');
        if (homeSection) homeSection.style.display = 'block';
        sectionId = 'homeSection'; // Correct ID for nav highlighting
    }

    // Update map if required by the current section
    if (sectionId === 'orderItemsSection' || sectionId === 'homeSection') {
        updateMap();
    }

    // Update bottom nav active state
    document.querySelectorAll('#bottomNav button').forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('onclick')?.includes(`switchSection('${sectionId}')`)) {
            button.classList.add('active');
        }
    });

    // *** Setup listener AFTER showing section if it's the chat section ***
    // Assumes chat elements are inside 'orderItemsSection' based on HTML. Adjust if you have a dedicated 'chatSection'.
    // If chat is inside 'orderItemsSection':
    if (sectionId === 'orderItemsSection') {
         console.log("Current section includes chat, setting up listener.");
         setupChatListener(); // Setup listener for this section
    }
    // // If you have a dedicated section: <section id="chatSection"...>
    // if (sectionId === 'chatSection') {
    //     console.log("Current section is chatSection, setting up listener.");
    //     setupChatListener();
    // }

}

function toggleAuth(formIdToShow) {
    console.log(`Toggling auth form: ${formIdToShow}`);
    const signUpFormDiv = document.getElementById('signUpForm');
    const loginFormDiv = document.getElementById('loginForm');
    if (signUpFormDiv) signUpFormDiv.style.display = (formIdToShow === 'signUpForm' ? 'block' : 'none');
    if (loginFormDiv) loginFormDiv.style.display = (formIdToShow === 'loginForm' ? 'block' : 'none');
    clearAllErrors();
    displayStatus('authMessage', '', null);
}
function showLoginForm() { toggleAuth('loginForm'); }
function showSignUpForm() { toggleAuth('signUpForm'); }

function displayDashboard(role) {
    // Simplified - actual dashboard elements might be more complex
    const orderPanel = document.getElementById('orderPanel'); // Customer panel
    const requestPanel = document.getElementById('orderRequestPanel'); // Driver panel
    if (orderPanel) orderPanel.style.display = (role === 'customer' || role === 'admin') ? 'block' : 'none'; // Admin might see customer view too?
    if (requestPanel) requestPanel.style.display = (role === 'driver') ? 'block' : 'none';
}

function updateMap() {
    const location = currentUser?.location || 'Location Not Set';
    // Update placeholders
    setText('userLocationDisplay', location);
    setText('userLocationDisplayHome', location);
    const mapText = `(Map showing area near <strong>${location || '?'}</strong>)`;
    setTextHTML('mapPlaceholder', mapText);
    setTextHTML('mapPlaceholderSmall', mapText);
}

function populateAccountInfo(user) {
     if (!user) return;
     setText('accountEmail', user.email);
     setText('accountName', user.displayName || '(Not set)');
     setText('accountLocation', user.location || 'N/A');
     setText('accountPhone', user.phone || 'N/A');
     setText('userRole', user.role || 'N/A');
     setText('accountUid', user.uid || 'N/A (Local)');
     setText('userEmailDisplay', user.displayName || user.email); // Header display
}

// --- Authentication Functions ---

function signInWithGoogleFirebase() {
    if (!auth || !googleProvider || !db) {
        console.error("Firebase services not ready for Google Sign-In.");
        displayStatus('authMessage', 'Service unavailable.', 'error');
        return;
    }
    console.log("Initiating Google Sign-In via Firebase...");
    displayStatus('authMessage', 'Opening Google Sign-In...', 'loading');

    signInWithPopup(auth, googleProvider)
      .then((result) => {
        const firebaseUser = result.user;
        console.log("Firebase Google Sign-In SUCCESS:", { email: firebaseUser.email, uid: firebaseUser.uid });
        displayStatus('authMessage', `Signed in as ${firebaseUser.email}. Loading profile...`, 'success');

        // Structure user data for the app
        const uid = firebaseUser.uid;
        const email = firebaseUser.email;
        const displayName = firebaseUser.displayName || email.split('@')[0];

        // ** CRITICAL: Fetch/Prompt for supplemental data **
        // In a real app, FETCH this from Firestore/RTDB based on UID.
        // Using localStorage/prompts for demo purposes only.
        console.log(`Getting supplemental data for UID: ${uid} (Demo: LS/prompt)`);
        let role = localStorage.getItem(`role_${uid}`) || promptUserForRole(displayName);
        let location = localStorage.getItem(`location_${uid}`) || promptUserForLocation();
        let phone = localStorage.getItem(`phone_${uid}`) || promptUserForPhone();

        currentUser = {
          email, uid, displayName, photoURL: firebaseUser.photoURL,
          role, location, phone, isFirebaseUser: true
        };

         // Persist supplemental info (to LS for demo - should be DB write)
         localStorage.setItem(`role_${uid}`, currentUser.role);
         localStorage.setItem(`location_${uid}`, currentUser.location);
         localStorage.setItem(`phone_${uid}`, currentUser.phone);
         // Persist main session object
         localStorage.setItem('clickngoUser', JSON.stringify(currentUser));

         // Save/Update user profile info in DB (Example for RTDB)
         const userProfileRef = ref(db, `users/${uid}`);
         set(userProfileRef, {
             email: currentUser.email,
             displayName: currentUser.displayName,
             role: currentUser.role,
             location: currentUser.location,
             phone: currentUser.phone,
             lastLogin: serverTimestamp() // Record last login time
         }).catch(err => console.error("Error saving user profile to RTDB:", err));

        // Update UI after short delay
        setTimeout(() => {
             updateUIForSignedInUser(currentUser);
             displayStatus('authMessage', '', null);
        }, 600);
      })
      .catch((error) => {
        console.error("Firebase Google Sign-In Error:", error);
        // Handle common errors gracefully
        let userMessage = `Google Sign-In Error: ${error.message}`;
        if (error.code === 'auth/popup-closed-by-user') userMessage = 'Sign-in cancelled.';
        if (error.code === 'auth/account-exists-with-different-credential') userMessage = 'Email already used.';
        if (error.code === 'auth/unauthorized-domain') userMessage = 'Domain not authorized.';
        displayStatus('authMessage', userMessage, 'error');
      });
}

function logoutFirebase() {
    if (!auth) { console.error("Firebase Auth not ready for logout."); return; }
    const userEmailForLog = currentUser?.email;
    console.log(`Attempting Firebase Sign Out for user: ${userEmailForLog || '(unknown)'}`);
    // Detach listener FIRST (safety)
    detachChatListener();

    signOut(auth).then(() => {
        console.log("Firebase Sign Out successful.");
        currentUser = null;
        localStorage.removeItem('clickngoUser'); // Clear local session
        // Supplemental LS data (role_uid etc.) remains but is unused

        resetApp(); // Handles UI reset, ensures chat listener off again
        displayStatus('authMessage', 'You have been logged out.', 'success');
        setTimeout(() => displayStatus('authMessage', '', null), 3500);

    }).catch((error) => {
        console.error("Firebase Sign Out Error:", error);
        // Attempt local cleanup anyway
        currentUser = null;
        localStorage.removeItem('clickngoUser');
        resetApp(); // Reset UI even on error
        alert(`Error during logout: ${error.message}. UI reset.`);
    });
}

// --- INSECURE Local Email/Password Functions (DEMO ONLY) ---
// [ These functions (signUp, generateOTP, verifyOTP, login) are kept as-is from previous code ]
// [ WARNING: These store passwords insecurely in LocalStorage. DO NOT USE IN PRODUCTION. ]
// [ Migrate to createUserWithEmailAndPassword and signInWithEmailAndPassword ]
async function signUp(event) { event.preventDefault(); console.warn("INSECURE local signup..."); clearAllErrors();
    const e = document.getElementById('signUpEmail')?.value.trim(),p = document.getElementById('signUpPassword')?.value.trim(),l = document.getElementById('signUpLocation')?.value.trim(),ph = document.getElementById('signUpPhone')?.value.trim(),r = document.getElementById('signUpRole')?.value;
    let v = true; if (!e || !isValidEmail(e)) { displayError('signUpEmailError', 'Valid email.'); v = false; } if (!p || p.length < 6) { displayError('signUpPasswordError', 'Min 6 chars.'); v = false; } if (!l) { displayError('signUpLocationError', 'Location required.'); v = false; } if (!ph || !isValidPhoneNumber(ph)) { displayError('signUpPhoneError', 'Valid phone.'); v = false; } if (!r) { displayError('signUpRoleError', 'Select role.'); v = false; } if (!v) return;
    try {const u = JSON.parse(localStorage.getItem('clickngoUsers') || '[]'); if (u.some(usr => usr.email === e)) { displayError('signUpEmailError', 'Email exists.'); return;}} catch (err) { console.error("LS read error:", err); alert("Error checking users."); return;}
    const otp = generateOTP(); sessionStorage.setItem('signUpData', JSON.stringify({ email:e, password:p, location:l, phone:ph, role:r, otp })); setText('otpMessage', `Enter code for ${e} (DEMO: ${otp})`); console.log(`INSECURE DEMO OTP: ${otp} for ${e}`); toggleVisibility('authSection', 'otpPage');}
function generateOTP() { return Math.floor(100000 + Math.random() * 900000).toString(); }
function verifyOTP() { console.warn("INSECURE local OTP verify..."); clearAllErrors('otpError', 'otpStatus'); const o=document.getElementById('otpInput')?.value.trim(),i=document.getElementById('otpInput'),s=sessionStorage.getItem('signUpData');
    if (!s || !o) { displayError('otpError', "Session/OTP missing."); resetToAuthState(); return; } let d; try { d = JSON.parse(s); } catch (e) { displayError('otpError', "Data error."); sessionStorage.removeItem('signUpData'); resetToAuthState(); return; } if (!d || !d.otp || !d.email || !d.password) { displayError('otpError', "Incomplete data."); sessionStorage.removeItem('signUpData'); resetToAuthState(); return; }
    if (o === String(d.otp)) { console.log(`Local OTP OK: ${d.email}`); displayStatus('otpStatus', 'Verifying...', 'loading'); setTimeout(() => { try { let u=JSON.parse(localStorage.getItem('clickngoUsers') || '[]'); if (u.some(usr=>usr.email === d.email)) { console.error(`Race condition: ${d.email}`); displayError('otpError', "Email registered."); displayStatus('otpStatus', '', null); sessionStorage.removeItem('signUpData'); resetToAuthState(); return;} const n = { email: d.email, password: d.password /* !!! BAD !!! */, location: d.location, phone: d.phone, role: d.role, uid: `local_${Date.now()}`, isFirebaseUser: false }; console.log("Creating INSECURE user:", n.email); u.push(n); localStorage.setItem('clickngoUsers', JSON.stringify(u)); sessionStorage.removeItem('signUpData'); currentUser = n; localStorage.setItem('clickngoUser', JSON.stringify(currentUser)); displayStatus('otpStatus', 'Success! Loading app...', 'success'); setTimeout(() => { updateUIForSignedInUser(currentUser); displayStatus('otpStatus', '', null); }, 900); } catch (storageError) { console.error("LS write error:", storageError); displayError('otpError', "Failed save."); displayStatus('otpStatus', '', null); }}, 1100); } else { console.log(`Local OTP FAIL: ${d.email}`); displayError('otpError', "Incorrect code."); if (i) i.value = ''; displayStatus('otpStatus', '', null); }}
async function login(event) { event.preventDefault(); console.warn("INSECURE local login..."); clearAllErrors(); const e=document.getElementById('loginEmail')?.value.trim(), p=document.getElementById('loginPassword')?.value.trim(), er=document.getElementById('loginError');
    if (!e || !p) { displayError(er ? 'loginError' : 'loginEmailError', 'Email & Password required.'); return; }
    try { const u=JSON.parse(localStorage.getItem('clickngoUsers') || '[]'); const user = u.find(usr => usr.email === e && usr.password === p && !usr.isFirebaseUser); if (user) { console.log(`INSECURE local login ok: ${e}`); displayStatus('authMessage', 'Login success...', 'success'); currentUser = user; localStorage.setItem('clickngoUser', JSON.stringify(currentUser)); setTimeout(() => { updateUIForSignedInUser(currentUser); displayStatus('authMessage', '', null); }, 1000); } else { console.log(`INSECURE local login fail: ${e}`); displayError(er ? 'loginError' : 'loginEmailError', 'Invalid email/password (local).'); displayStatus('authMessage', '', null); } } catch (err) { console.error("Local login error:", err); displayError(er ? 'loginError' : 'loginEmailError', 'Login error occurred.'); displayStatus('authMessage', '', null); } }
// --- End of INSECURE Demo Section ---

// --- User Profile & Admin ---
// [loadAllUsers, deleteAccount remain conceptually similar, but deleteAccount now uses Firebase Auth delete]
async function loadAllUsers() { /* Loads users ONLY from the INSECURE localStorage list */ console.log("Admin: Loading local users..."); const el=document.getElementById('allUsers'); if (!el) return; el.innerHTML='Loading...'; setTimeout(()=>{ try {const u=JSON.parse(localStorage.getItem('clickngoUsers')||'[]'); el.innerHTML=''; if(u.length===0){el.innerHTML='<p>No local users.</p>';return;} const ul=document.createElement('ul');ul.style.listStyleType='none';ul.style.paddingLeft='0'; u.forEach(usr=>{ const li=document.createElement('li');li.style.cssText='margin-bottom:15px;padding-bottom:10px;border-bottom:1px dotted #ccc;'; let h=`<strong>Email:</strong> ${usr.email||'?'}<br>${usr.displayName?`<strong>Name:</strong> ${usr.displayName}<br>`:''}<strong>UID:</strong> <small>${usr.uid||'N/A'}</small><br><strong>Loc:</strong> ${usr.location||'?'}<br><strong>Phone:</strong> ${usr.phone||'?'}<br><strong>Role:</strong> ${usr.role||'?'}<br><small>(${usr.isFirebaseUser?'Firebase':'Local'})</small>`; li.innerHTML=h;ul.appendChild(li);});el.appendChild(ul); } catch(e){console.error("Admin load user error:",e);el.innerHTML='<p class="error-message">Error loading.</p>';}}, 400); }
async function deleteAccount() { if (!currentUser?.email) { alert("Must be logged in."); return; } console.log(`Deletion requested: ${currentUser.email} (Firebase: ${!!currentUser.isFirebaseUser})`); if (!confirm(`DELETE ACCOUNT (${currentUser.email})? IRREVERSIBLE!`)) { console.log("Deletion cancelled."); return; }
    if (currentUser.isFirebaseUser && currentUser.uid && auth) { const fbUser = auth.currentUser; if (fbUser && fbUser.uid === currentUser.uid) { try { displayStatus('authMessage','Deleting...','loading'); await fbUser.delete(); console.log("Firebase user deleted."); localStorage.removeItem(`role_${currentUser.uid}`); localStorage.removeItem(`location_${currentUser.uid}`); localStorage.removeItem(`phone_${currentUser.uid}`); try{let u=JSON.parse(localStorage.getItem('clickngoUsers')||'[]');u=u.filter(usr=>usr.uid !== currentUser.uid);localStorage.setItem('clickngoUsers',JSON.stringify(u));console.log("Removed from local list.");}catch(lsErr){} /* REMINDER: Add Cloud Function trigger for DB data cleanup */ alert('Account deleted.'); logoutFirebase(); } catch (error) { console.error("FB delete error:",error); displayStatus('authMessage','',null); if(error.code==='auth/requires-recent-login'){alert("Sensitive action. Sign in again, then delete immediately.");}else{alert(`Error deleting: ${error.message}`);}}} else { console.error("Deletion Mismatch!"); alert("Auth mismatch. Logout, login, retry."); return;}}
    else if (!currentUser.isFirebaseUser && currentUser.email) { console.warn(`Deleting INSECURE user: ${currentUser.email}`); try {let u = JSON.parse(localStorage.getItem('clickngoUsers') || '[]');const i = u.length; u = u.filter(usr => !(usr.email === currentUser.email && !usr.isFirebaseUser)); if (u.length < i) {localStorage.setItem('clickngoUsers', JSON.stringify(u)); console.log("Local user removed."); alert('Local data removed.');} else {alert('Local user not found.');} logoutFirebase();} catch (e) {console.error("Local delete error:", e); alert("Error removing local data."); logoutFirebase();}}
    else { console.error("Cannot delete: Invalid state.", currentUser); alert("Internal error."); }}

// --- Prompts (Replace with UI Modals) ---
function promptUserForRole(name){console.warn("Using PROMPT for Role!");let r=prompt(`Welcome ${name||'User'}! Role: customer, driver, admin?`,"customer"); r=r?.trim().toLowerCase();return ['customer','driver','admin'].includes(r)?r:'customer';}
function promptUserForLocation(){console.warn("Using PROMPT for Location!");return prompt("Enter city/location:","")||"Not Set";}
function promptUserForPhone(){console.warn("Using PROMPT for Phone!");let p=prompt("Phone (optional):","");return p||"N/A";}

// --- Feature Functions ---
// [simulateOrder, showOrderHistory, updateTracking remain the same - local storage based demos]
function simulateOrder() { if (!currentUser) { alert("Log in."); return; } console.log(`Simulating order: ${currentUser.email}`); try { let o=JSON.parse(localStorage.getItem('orders')||'[]');const n={orderId:`CNG-${Date.now().toString().slice(-7)}`,userEmail:currentUser.email,userId:currentUser.uid,date:new Date().toLocaleString(),items:"Simulated Item",status:"Pending",location:currentUser.location};o.push(n);localStorage.setItem('orders',JSON.stringify(o)); alert('Demo Order Placed!'); showOrderHistory(); updateTracking(n.orderId); if(document.getElementById('orderItemsSection').style.display==='none') switchSection('orderItemsSection');} catch(e){console.error("SimOrder Error:",e);alert("Order demo failed.");}}
function showOrderHistory() { console.log("Show history:", currentUser?.email); const el=document.getElementById('orderList'); if(!el) return; if(document.getElementById('orderHistorySection').style.display==='none') switchSection('orderHistorySection'); el.innerHTML='Loading...'; setTimeout(()=>{ try {const a=JSON.parse(localStorage.getItem('orders')||'[]');const u=currentUser?.role==='admin'?a:a.filter(o=>o.userEmail===currentUser?.email || (currentUser?.uid && o.userId===currentUser?.uid)); el.innerHTML=''; if(u.length===0){el.innerHTML='<p>No history.</p>';}else{u.sort((a,b)=>(new Date(b.date)||0)-(new Date(a.date)||0));u.forEach(o=>{const i=document.createElement('div');i.className='order-history-item';const s=`status-${(o.status||'?').toLowerCase().replace(/\s+/g,'-')}`;i.innerHTML=`<h4>#${o.orderId||'?'}</h4><p><strong>Date:</strong> ${o.date||'?'}</p><p><strong>Items:</strong> ${o.items||'?'}</p><p><strong>Status:</strong> <span class="${s}">${o.status||'?'}</span></p>${currentUser?.role==='admin'?`<p><small>User: ${o.userEmail||o.userId||'?'} (${o.location||'?'})</small></p>`:''}<hr style='border:0;border-top:1px dashed #eee;margin:8px 0;'>`; el.appendChild(i);});}} catch(e){console.error("History load error:",e); el.innerHTML='<p class="error">History load fail.</p>';}}, 300);}
function updateTracking(orderId) { console.log(`SimTrack: ${orderId}`); const el=document.getElementById('trackingPanel'); if(!el) return; if(window.currentTrackingInterval){clearInterval(window.currentTrackingInterval);window.currentTrackingInterval=null;} if(!orderId){el.innerHTML='Place/select order.';return;} el.innerHTML=`Loading ${orderId}...`; setTimeout(()=>{ const o=JSON.parse(localStorage.getItem('orders')||'[]'); const order=o.find(ord=>ord.orderId===orderId); if(!order){el.innerHTML=`<p class="error">Order ${orderId} not found.</p>`; return;} el.innerHTML=`<h4>Track: ${orderId}</h4><p id="trackingStatusDisplay">Status: ...</p>`; const disp=document.getElementById('trackingStatusDisplay'); if(!disp)return; const stages=["Pending","Driver Assigned","Picking Up","On the Way","Delivered"]; let c=stages.indexOf(order.status); if(c<0)c=0; const upd=(idx)=>{const n=stages[idx],l=idx>=stages.length-1,s=`status-${n.toLowerCase().replace(/\s+/g,'-')}`;disp.innerHTML=`Status: <strong class="${s}">${n}${l?'':'...'}</strong>`;}; upd(c); if(c>=stages.length-1){console.log("Track stop: Delivered.");return;} window.currentTrackingInterval=setInterval(()=>{ c++;upd(c); try{let ls=JSON.parse(localStorage.getItem('orders')||'[]');let uls=ls.map(lso=>(lso.orderId===orderId?{...lso, status: stages[c]}:lso));localStorage.setItem('orders',JSON.stringify(uls));}catch(e){} if(c>=stages.length-1){console.log(`Track ${orderId} end: Delivered.`);clearInterval(window.currentTrackingInterval);window.currentTrackingInterval=null; if(document.getElementById('orderHistorySection')?.style.display==='block') showOrderHistory();}}, 5000 + Math.random() * 5000);}, 600);}

// --- Realtime Chat Functions (Firebase RTDB) ---

/** Sets up the listener for new chat messages with detailed logging */
function setupChatListener() {
    // Ensure preconditions are met
    if (!currentUser || !chatMessagesRef || !db) {
        console.warn("setupChatListener PREVENTED: User:", !!currentUser, "DB Ref:", !!chatMessagesRef, "DB Inst:", !!db);
        const messagesDiv = document.getElementById('chatMessages');
        if (messagesDiv) messagesDiv.innerHTML = '<p class="error-message">Cannot connect to chat. Please log in.</p>';
        return;
    }

    // Avoid duplicate listeners
    if (chatListenerUnsubscribe) {
        console.log("Chat listener is already active. Skipping setup.");
        return;
    }

    console.log("Attempting to setup Firebase RTDB listener for chat at:", chatMessagesRef.toString()); // Log the DB path
    const messagesDiv = document.getElementById('chatMessages');
    if (!messagesDiv) {
        console.error("FATAL: Chat messages display element (#chatMessages) not found during listener setup.");
        return;
    }
    messagesDiv.innerHTML = '<p class="loading-message loading">Attaching listener and loading chat...</p>'; // Indicate attaching

    // Attach the listener using onValue
    chatListenerUnsubscribe = onValue(chatMessagesRef, (snapshot) => {
        console.log("%c Firebase onValue triggered!", "color: green; font-weight: bold;"); // Log when callback fires
        console.log("Snapshot exists:", snapshot.exists());

        // Check if currentUser is still valid *inside* the callback (essential for async)
        console.log("currentUser inside onValue:", currentUser);
        if (!currentUser || !currentUser.uid) {
             console.error("currentUser became invalid/null inside the onValue callback! Cannot reliably determine message ownership.");
             // Optionally display an error in the chat or detach
             // const currentMessagesDiv = document.getElementById('chatMessages');
             // if (currentMessagesDiv) currentMessagesDiv.innerHTML = '<p class="error-message">Session error during chat. Refresh may be needed.</p>';
             // detachChatListener(); // Detach if user session is lost
             // return; // Stop processing this snapshot if user context is lost
        }

        // Get the chat messages display element again safely
        const currentMessagesDiv = document.getElementById('chatMessages');
         if (!currentMessagesDiv) {
             console.error("Chat messages element #chatMessages disappeared unexpectedly!");
             return; // Can't proceed without the container
         }
        currentMessagesDiv.innerHTML = ''; // Clear previous messages / loading indicator

        if (!snapshot.exists()) {
            console.log("Snapshot is empty. Displaying 'No messages yet'.");
            currentMessagesDiv.innerHTML = '<p><i>No messages yet. Start the conversation!</i></p>';
            return; // Stop processing if there's no data
        }

        const messages = snapshot.val(); // Get the data object
        console.log("Raw messages data received from Firebase:", messages); // Log the raw data

        let messageCount = 0; // Counter for processed messages
        try {
            // Get message keys, sort them by timestamp (handle missing timestamps gracefully)
            const sortedKeys = Object.keys(messages).sort((a, b) => (messages[a]?.timestamp || 0) - (messages[b]?.timestamp || 0));
            console.log(`Found ${sortedKeys.length} message keys. Processing...`);

            sortedKeys.forEach(key => {
                const messageData = messages[key];
                console.log(`Processing message key: ${key}`, messageData); // Log each message being processed

                // **Robustness Check**: Ensure essential data exists
                if (!messageData || typeof messageData.text !== 'string' || typeof messageData.senderUid !== 'string') {
                    console.warn(`Skipping message key ${key} due to missing/invalid essential data (text or senderUid):`, messageData);
                    return; // Skip rendering this malformed message
                }

                const messageElement = document.createElement('div');
                messageElement.classList.add('message');

                // Determine if the message is 'own' or 'incoming' using safe access to currentUser
                if (messageData.senderUid === currentUser?.uid) {
                    messageElement.classList.add('own');
                    messageElement.textContent = messageData.text;
                } else {
                    messageElement.classList.add('incoming');
                    const senderDisplayName = messageData.senderName || 'Unknown'; // Graceful fallback for sender name
                    messageElement.innerHTML = `<strong>${senderDisplayName}:</strong> ${messageData.text}`;
                }

                // Add timestamp if available
                 if (typeof messageData.timestamp === 'number') {
                    const timestampSpan = document.createElement('span');
                    timestampSpan.classList.add('message-timestamp');
                    try {
                         // Format timestamp into readable time
                        timestampSpan.textContent = new Date(messageData.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                    } catch (e) {
                       console.warn("Failed to format timestamp for message key:", key, messageData.timestamp, e);
                    }
                    messageElement.appendChild(timestampSpan);
                 }

                currentMessagesDiv.appendChild(messageElement);
                messageCount++;
            });

            console.log(`Successfully processed and displayed ${messageCount} messages.`);

            // Scroll to the bottom of the chat window
            currentMessagesDiv.scrollTop = currentMessagesDiv.scrollHeight;

        } catch (error) {
            // Catch errors during the message processing loop
            console.error("Error occurred WHILE PROCESSING/RENDERING messages:", error);
             if(currentMessagesDiv) currentMessagesDiv.innerHTML = '<p class="error-message">Error displaying messages. Check console.</p>';
        }

    }, (error) => {
        // Handle errors during the initial connection or subsequent reads
        console.error("%c Firebase RTDB onValue read error:", "color: red; font-weight: bold;", error);
        const currentMessagesDiv = document.getElementById('chatMessages');
        if (currentMessagesDiv) {
            // Display a user-friendly error message
            currentMessagesDiv.innerHTML = `<p class="error-message">Error loading chat (${error.code || 'Unknown error'}). Check Rules/Connection.</p>`;
        }
        // Detach the listener on a read error to prevent repeated failures?
         detachChatListener();
    });

    console.log("Chat listener attach function (onValue) registration complete.");
}


/** Detaches the Firebase listener and logs the action */
function detachChatListener() {
    // Log if detachment is attempted
    if (chatListenerUnsubscribe) {
        console.log("<<<< Detaching Firebase Realtime Database chat listener. >>>>");
        chatListenerUnsubscribe(); // Execute the unsubscribe function
        chatListenerUnsubscribe = null; // Clear the reference
    } else {
        // console.log("No active chat listener to detach."); // Optional: Log if no listener was active
    }
}

/** Sends a message to Firebase RTDB */
function sendMessage() {
    const input = document.getElementById('chatInput');
    if (!input) { console.error("Chat input element #chatInput not found."); return; }
    const messageText = input.value.trim();

    // --- Pre-send Validations ---
    if (!currentUser || !currentUser.uid || !currentUser.displayName) {
        console.warn("SendMessage Prevented: User not fully logged in or profile incomplete.", currentUser);
        alert("You must be logged in with a valid profile to send messages.");
        return;
    }
    if (!db || !chatMessagesRef) {
         console.error("SendMessage Prevented: Database service/reference not available.");
         alert("Chat service is temporarily unavailable.");
         return;
    }
    if (!messageText) {
        console.log("Empty chat message ignored.");
        return; // Do not send empty messages
    }
    // --- End Validations ---

    console.log(`Sending chat message as ${currentUser.displayName} (UID: ${currentUser.uid}): "${messageText}"`);

    // Prepare message data object
    const messageData = {
        text: messageText,
        senderUid: currentUser.uid,
        senderName: currentUser.displayName, // Use verified display name
        timestamp: serverTimestamp() // Use reliable server time
    };

    // Generate a unique ID and save the message
    const newMessageRef = push(chatMessagesRef); // Creates ref like /chats/mainRoom/-Mxyz...
    set(newMessageRef, messageData)
        .then(() => {
            console.log("Message sent successfully to RTDB path:", newMessageRef.toString());
            input.value = ''; // Clear input field *only* on successful send
            input.focus(); // Set focus back to input for convenience
        })
        .catch((error) => {
            console.error("Error sending message to Firebase RTDB:", error);
            alert(`Failed to send message: ${error.message}. Check DB Rules.`);
            // Do not clear input on error, allowing user retry
        });
     // NOTE: The 'onValue' listener will automatically pick up and display this message.
}

// ... (submitFeedback unchanged) ...
function submitFeedback(event) { event.preventDefault(); if (!currentUser) { alert("Log in first."); return; } const i=document.getElementById('feedbackMessage'), s=document.getElementById('feedbackStatus'); if(!i||!s) return; const m=i.value.trim(); if (!m) { displayStatus('feedbackStatus', 'Empty message.', 'error'); return; } console.log(`Feedback from ${currentUser.email}`); displayStatus('feedbackStatus', 'Sending...', 'loading'); setTimeout(() => { try { const f = JSON.parse(localStorage.getItem('feedbackMessages') || '[]'); f.push({ userEmail: currentUser.email, userId: currentUser.uid, message:m, timestamp: new Date().toISOString() }); localStorage.setItem('feedbackMessages', JSON.stringify(f)); console.log("Feedback saved to LS."); displayStatus('feedbackStatus', 'Sent! Thanks.', 'success'); i.value = ''; notifyUser("Feedback received!"); setTimeout(() => displayStatus('feedbackStatus', '', null), 4000); } catch (e) { console.error("Feedback save error:", e); displayStatus('feedbackStatus', 'Error saving.', 'error'); } }, 1200); }

// --- Settings & Preferences ---
// [loadPreferences, savePreferences, toggleDarkMode unchanged - uses localStorage]
function loadPreferences() { try{const p=JSON.parse(localStorage.getItem('userPreferences')||'{}'); const l=document.getElementById('languageSelect');if(l&&p.language)l.value=p.language; const t=p.theme||'light'; const d=document.getElementById('darkModeToggle'); document.body.classList.toggle('dark-mode',t==='dark'); if(d)d.checked=(t==='dark'); console.log("Prefs loaded:",p);}catch(e){console.error("Prefs load fail:",e);}}
function savePreferences() { const s=document.getElementById('userPreferencesStatus'); if(s) displayStatus('userPreferencesStatus','Saving...','loading'); setTimeout(()=>{try{const p={language:document.getElementById('languageSelect')?.value||'en',theme:document.getElementById('darkModeToggle')?.checked?'dark':'light'}; localStorage.setItem('userPreferences',JSON.stringify(p)); console.log("Prefs saved:",p); if(s) displayStatus('userPreferencesStatus','Saved!','success'); setTimeout(()=>displayStatus('userPreferencesStatus','',null), 2500);}catch(e){console.error("Prefs save fail:",e);if(s)displayStatus('userPreferencesStatus','Error.','error');}},400);}
function toggleDarkMode() { const d = document.body.classList.toggle('dark-mode'); console.log(`Dark Mode ${d ? 'ON' : 'OFF'}.`); const c = document.getElementById('darkModeToggle'); if (c) c.checked = d; savePreferences(); }

// --- Utility Functions ---
// [loadFaq, setText, setTextHTML, updateClock, displayWelcomeMessage, clearInput, isValidEmail, isValidPhoneNumber, notifyUser, displayStatus, displayError, clearAllErrors unchanged]
function loadFaq() { const el=document.getElementById('faqList'); if(!el) return; el.innerHTML=''; const f=[ { q: "Services?", a: "Click n Go is an on-demand delivery service located in Isok 1 Boac, Marinduque that offers fast and affordable transportation services. Click n' Go ownership status is corporation who work as a team. Our service allows customer to easily book a delivery whether it's food, groceries, packages, or any other type of delivery through user friendly mobile-app or website and have it delivered by our driver. This app connects users with local couriers in real-time, ensuring fast, reliable, and cost-effective services." }, { q: "Booking?", a: "Via Facebook page DM (link in Orders)." }, { q: "Support?", a: "Email clickngoservice@gmail.com, call 09165540988, or FB msg." }, { q: "Hours?", a: "Usually 12hrs daily. Check FB for specifics." }, { q: "Cost?", a: "Varies. Ask for quote on FB." }]; if(f.length===0){el.innerHTML='<p>No FAQs.</p>';return;} f.forEach(fq=>{ const i=document.createElement('div');i.className='faq-item'; const qp=document.createElement('p');qp.className='faq-question';qp.innerHTML='<strong>Q:</strong> '; qp.appendChild(document.createTextNode(fq.q)); const ap=document.createElement('p');ap.className='faq-answer';ap.innerHTML='<strong>A:</strong> '; ap.appendChild(document.createTextNode(fq.a)); i.appendChild(qp);i.appendChild(ap);el.appendChild(i);}); console.log(`Loaded ${f.length} FAQs.`);}
function setText(id, txt, d = "N/A") { const el=document.getElementById(id); if(el) el.textContent = txt || d; }
function setTextHTML(id, h, d = "") { const el=document.getElementById(id); if(el) el.innerHTML = h || d; }
function updateClock() { const el=document.getElementById('clockDisplay'); if(el) el.innerText=new Date().toLocaleTimeString([],{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'}); }
function displayWelcomeMessage() { const el=document.getElementById('welcomeMessage'); if(!el)return; const h=new Date().getHours();let m="evening";if(h<5)m="night";else if(h<12)m="morning";else if(h<18)m="afternoon"; el.innerText=`Good ${m}!`; }
function clearInput(id) { const el=document.getElementById(id); if(el) el.value=''; displayError(id+'Error',''); }
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e||'').toLowerCase()); }
function isValidPhoneNumber(p) { return /^\+?\d{7,15}$/.test(String(p||'').replace(/\D/g, '')); }
function notifyUser(m){if(!('Notification'in window))return; Notification.requestPermission().then(p=>{if(p==='granted')new Notification('Click n Go',{body:m})});}
function displayStatus(id, msg, type=null) { const el=document.getElementById(id); if(!el)return; el.innerText=msg||''; el.className='status-message'; if(type==='loading')el.classList.add('loading-message','loading'); else if(type==='success')el.classList.add('success'); else if(type==='error')el.classList.add('error-message'); }
function displayError(id, msg) { const el=document.getElementById(id); if(el){el.innerText=msg||'';el.classList.add('error-message');} }
function clearAllErrors() { ['signUpEmailError','signUpPasswordError','signUpLocationError','signUpPhoneError','signUpRoleError','loginError','loginEmailError','loginPasswordError','otpError'].forEach(id=>displayError(id,'')); ['otpStatus','feedbackStatus','userPreferencesStatus','authMessage'].forEach(id=>displayStatus(id,'',null)); }

/** Reset forms, clear errors/state, show login, ensure chat listener is off */
function resetApp() {
    console.log("Resetting application UI and state...");
    detachChatListener(); // *** Crucial: Ensure listener is detached ***
    document.getElementById('signupFormElem')?.reset();
    document.getElementById('loginFormElem')?.reset();
    clearAllErrors();
    resetToAuthState(); // Resets UI to show login page
}

// *** END of script.js ***
