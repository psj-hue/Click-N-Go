// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, deleteDoc } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD-pAz5_An9-i777fVmDyzAVFvlCdSN8kY",
  authDomain: "awesome-project-59d12.firebaseapp.com",
  projectId: "awesome-project-59d12",
  storageBucket: "awesome-project-59d12.firebasestorage.app",
  messagingSenderId: "934701962652",
  appId: "1:934701962652:web:17ffe603b8ccfcb7ea6459",
  measurementId: "G-09E03HDR4Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firestore
const db = getFirestore(app);

let generatedOTP = ""; // No longer needed
const feedbackMessages = JSON.parse(localStorage.getItem('feedbackMessages')) || [];
const faqData = [
    {
        question: "What services do you provide?",
        answer: "We provide 12-hour motor-taxi and delivery services."
    },
    {
        question: "How can I place an order?",
        answer: "You can place an order through our Facebook page."
    },
    {
        question: "How do I contact support?",
        answer: "You can email us at clickngoservice@gmail.com or call us at 09165540988."
    }
];

let currentUser = null; // Store the current user information

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Google Sign-In
    google.accounts.id.initialize({
        client_id: '735535160092-mrurmqhnrjmrp6kb6tokrj5ob5d134hp.apps.googleusercontent.com',
        callback: handleCredentialResponse
    });

    // Render the Google Sign-In button
    google.accounts.id.renderButton(
        document.getElementById('googleSignInDiv'),
        { theme: "outline", size: "large" }  // customization attributes
    );
    google.accounts.id.prompt(); // to display the One Tap dialog

    // Check if there's a previously logged-in user (e.g., token in local storage)
    const storedUser = localStorage.getItem('googleUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        updateUIForSignedInUser(currentUser);
    } else {
        switchSection('home'); // Show default home if not signed in
    }

    loadFaq();
    updateClock();
    displayWelcomeMessage();
    setInterval(updateClock, 1000);
});

function handleCredentialResponse(response) {
    console.log("Google Credential Response:", response);
    const idToken = response.credential;
    const decodedToken = JSON.parse(atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    console.log("Decoded ID Token:", decodedToken);

    currentUser = decodedToken;
    localStorage.setItem('googleUser', JSON.stringify(currentUser));
    updateUIForSignedInUser(currentUser);
    // In a real application, you would likely send the idToken to your server for verification and session management.
}

async function updateUIForSignedInUser(user) {
    toggleVisibility('authSection', 'appSection');
    populateAccountInfo(user);
    // Assuming a default role for Google Sign-in users or fetch from server
    const role = await getUserRoleFromFirestore(user.email);
    if (role === 'admin') {
        switchSection('account');
        loadAllUsers();
    } else if (role) {
        switchSection('home');
        displayDashboard(role);
        updateMap();
    } else {
        // Handle case where role is not found (e.g., new user)
        switchSection('home');
        displayDashboard('customer'); // Default role
        updateMap();
    }
}

async function getUserRoleFromFirestore(email) {
    try {
        const usersCollection = collection(db, 'users');
        const q = query(usersCollection, where('email', '==', email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data().role;
        }
        return null;
    } catch (error) {
        console.error("Error fetching user role:", error);
        return null;
    }
}

async function signUp(event) {
    event.preventDefault();
    const email = document.getElementById('signUpEmail').value.trim();
    const password = document.getElementById('signUpPassword').value.trim();
    const location = document.getElementById('signUpLocation').value.trim();
    const phone = document.getElementById('signUpPhone').value.trim();
    const role = document.getElementById('signUpRole').value;

    if (!isValidEmail(email)) {
        document.getElementById('signUpEmailError').innerText = 'Invalid Email format.';
        return;
    } else {
        document.getElementById('signUpEmailError').innerText = '';
    }

    if (password.length < 6) {
        document.getElementById('signUpPasswordError').innerText = 'Password must be at least 6 characters.';
        return;
    } else {
        document.getElementById('signUpPasswordError').innerText = '';
    }
    if (!isValidPhoneNumber(phone)) {
        document.getElementById('signUpPhoneError').innerText = 'Invalid Phone number.';
        return;
    } else {
        document.getElementById('signUpPhoneError').innerText = '';
    }

    try {
        // Store additional user info in Firestore (assuming email/password signup)
        const usersCollection = collection(db, 'users');
        const userDocRef = doc(usersCollection, email); // Use email as document ID
        await setDoc(userDocRef, {
            email: email,
            location: location,
            phone: phone,
            role: role
        });
        document.getElementById('authMessage').innerText = 'Sign up successful!';
        // Directly navigate to app
        currentUser = { email: email }; // Simulate logged-in user
        localStorage.setItem('googleUser', JSON.stringify(currentUser));
        updateUIForSignedInUser(currentUser);

    } catch (error) {
        document.getElementById('authMessage').innerText = error.message;
    }
}

async function login(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    // For simplicity, assuming you have a way to verify email/password (e.g., against Firestore or a backend)
    // This is a placeholder - replace with your actual authentication logic
    const role = await getUserRoleFromFirestore(email);
    if (role) {
        document.getElementById('authMessage').innerText = 'Login successful!';
        currentUser = { email: email }; // Simulate logged-in user
        localStorage.setItem('googleUser', JSON.stringify(currentUser));
        updateUIForSignedInUser(currentUser);
    } else {
        document.getElementById('authMessage').innerText = 'Invalid credentials.';
    }
}

function populateAccountInfo(user) {
    document.getElementById('accountEmail').innerText = user.email || "Not Provided";
    document.getElementById('userEmailDisplay').innerText = user.email || "User";
    getUserProfile(user.email).then(profile => {
        if (profile) {
            document.getElementById('accountLocation').innerText = profile.location || "Not Provided";
            document.getElementById('accountPhone').innerText = profile.phone || "Not Provided";
            document.getElementById('userRole').innerText = profile.role || "Not Provided";
        }
    });
}

async function getUserProfile(email) {
    try {
        const userDocRef = doc(db, 'users', email);
        const docSnap = await getDoc(userDocRef);
        return docSnap.data();
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

async function getUserRole(uid) { // This is no longer directly used with Google Sign-In
    // You might need a different way to determine the role for Google users
    // For now, we are fetching role based on email
    return null;
}

function logout() {
    localStorage.removeItem('googleUser');
    currentUser = null;
    document.getElementById('authMessage').innerText = 'Logged out successfully!';
    resetApp();
    switchSection('home'); // Go back to the home/auth section
}

function deleteAccount() {
    const userEmail = currentUser?.email;
    if (userEmail && confirm('Are you sure you want to delete your account?')) {
        const userDocRef = doc(db, 'users', userEmail);
        deleteDoc(userDocRef)
            .then(() => {
                document.getElementById('authMessage').innerText = 'Account deleted!';
                logout(); // Also log out after deleting
            })
            .catch(error => {
                document.getElementById('authMessage').innerText = 'Error deleting account.';
            });
    }
}

function resetApp() {
    document.getElementById('signupFormElem').reset();
    document.getElementById('loginFormElem').reset();
    toggleVisibility('appSection', 'authSection');
    document.querySelectorAll('.error-message').forEach(item => item.innerHTML = '');
}

function switchSection(section) {
    document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
    const userEmail = currentUser?.email;
    getUserRoleFromFirestore(userEmail).then(role => {
        if (section === 'account' && role === 'admin') {
            document.getElementById('adminSection').style.display = 'block';
            loadAllUsers();
        } else {
            document.getElementById('adminSection').style.display = 'none';
        }
        document.getElementById(section + 'Section').style.display = 'block';
        document.getElementById('authMessage').innerText = '';
        if (section === 'orderItems') {
            updateMap();
        }
    });
}

function toggleAuth(formId) {
    document.getElementById('signUpForm').style.display = formId === 'signUpForm' ? 'block' : 'none';
    document.getElementById('loginForm').style.display = formId === 'loginForm' ? 'block' : 'none';
    document.getElementById('authMessage').innerText = '';
}

function toggleVisibility(hideSection, showSection) {
    document.getElementById(hideSection).style.display = 'none';
    document.getElementById(showSection).style.display = 'block';
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhoneNumber(phone) {
    const phoneRegex = /^[+]?[\d\s-]*$/;
    const cleanedPhone = phone.replace(/[\s-]/g, '');
    if (!phoneRegex.test(phone.trim())) {
        return false;
    }
    return cleanedPhone.length >= 7;
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

async function loadAllUsers() {
    const allUsersElement = document.getElementById('allUsers');
    allUsersElement.innerHTML = '<div class="loading-message loading">Loading users...</div>';
    setTimeout(async () => {
        allUsersElement.innerHTML = '';
        try {
            const usersCollection = collection(db, 'users');
            const querySnapshot = await getDocs(usersCollection);
            querySnapshot.forEach(doc => {
                const user = doc.data();
                const userDiv = document.createElement('div');
                userDiv.innerHTML = `
                    <p>Email: ${user.email}</p>
                    <p>Location: ${user.location}</p>
                    <p>Phone Number: ${user.phone}</p>
                    <p>Role: ${user.role}</p>
                    <hr />
                `;
                allUsersElement.appendChild(userDiv);
            });
        } catch (error) {
            allUsersElement.innerHTML = `<p>Error loading users: ${error.message}</p>`;
        }
    }, 1500);
}

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('clockDisplay').innerText = `${hours}:${minutes}:${seconds}`;
}

function displayWelcomeMessage() {
    const now = new Date();
    const hour = now.getHours();
    let message = "";

    if (hour >= 5 && hour < 12) {
        message = "Good morning!";
    } else if (hour >= 12 && hour < 18) {
        message = "Good afternoon!";
    } else {
        message = "Good evening!";
    }
    document.getElementById('welcomeMessage').innerText = message;
}

function clearInput(inputId) {
    document.getElementById(inputId).value = '';
}

function displayDashboard(role) {
    if (role === 'customer') {
        document.getElementById('orderPanel').style.display = 'block';
        document.getElementById('orderRequestPanel').style.display = 'none';
    }
    if (role === 'driver') {
        document.getElementById('orderPanel').style.display = 'none';
        document.getElementById('orderRequestPanel').style.display = 'block';
    }
}

function submitFeedback(event) {
    event.preventDefault();
    const feedbackMessage = document.getElementById('feedbackMessage').value.trim();
    const feedbackStatus = document.getElementById('feedbackStatus');
    feedbackStatus.classList.add('loading');
    feedbackStatus.innerText = 'Sending feedback...';
    setTimeout(() => {
        feedbackMessages.push({
            user: currentUser.email,
            message: feedbackMessage
        });
        feedbackStatus.classList.remove('loading');
        feedbackStatus.innerText = 'Feedback Sent!';
        localStorage.setItem('feedbackMessages', JSON.stringify(feedbackMessages));
        document.getElementById('feedbackForm').reset();
        notifyUser("Feedback sent!");
    }, 1500);
}

function showOrderHistory() {
    switchSection('orderHistory');
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    const orderList = document.getElementById('orderList');
    orderList.innerHTML = '';
    if (orders.length === 0) {
        orderList.innerHTML = 'No previous orders.';
    }
    orders.forEach((order, index) => {
        const orderElement = document.createElement('div');
        orderElement.innerHTML = `
            <p>Order #${index + 1}:</p>
            <p>Date: ${order.date}</p>
            <p>Item: ${order.items}</p>
            <p>Status: ${order.status}</p>
            <hr />
        `;
        orderList.appendChild(orderElement);
    });
}

function simulateOrder() {
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    const newOrder = {
        date: new Date().toDateString(),
        items: "Test Order",
        status: "Pending"
    };
    orders.push(newOrder);
    localStorage.setItem('orders', JSON.stringify(orders));
    notifyUser("Order Placed!");
    updateTracking();
    alert('Order Received! Check order history.');
}

function loadFaq() {
    const faqListElement = document.getElementById('faqList');
    faqListElement.innerHTML = '';
    faqData.forEach(faq => {
        const faqElement = document.createElement('div');
        faqElement.innerHTML = `
            <p>Q: ${faq.question}</p>
            <p>A: ${faq.answer}</p>
            <hr/>
        `;
        faqListElement.appendChild(faqElement);
    });
}

function loadPreferences() {
    const userPreferences = JSON.parse(localStorage.getItem('userPreferences')) || {};
    if (userPreferences.language) {
        document.getElementById('languageSelect').value = userPreferences.language;
    }
}

function savePreferences() {
    const languageSelect = document.getElementById('languageSelect').value;
    const userPreferencesStatus = document.getElementById('userPreferencesStatus');
    userPreferencesStatus.classList.add('loading');
    userPreferencesStatus.innerText = 'Saving preferences...';
    setTimeout(() => {
        userPreferencesStatus.classList.remove('loading');
        userPreferencesStatus.innerText = 'Preferences Saved!';
        const userPreferences = {
            language: languageSelect
        };
        localStorage.setItem('userPreferences', JSON.stringify(userPreferences));
    }, 1500);
}

function updateMap() {
    getUserProfile(currentUser?.email).then(profile => {
        const location = profile?.location || 'Location Not Set';
        document.getElementById('userLocationDisplay').innerText = location;
    });
    // Basic placeholder map (replace with actual map API)
}

function notifyUser(message) {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('Click n Go!', {
                    body: message,
                });
            }
        });
    }
}

function updateTracking() {
    const trackingPanel = document.getElementById('trackingPanel');
    trackingPanel.innerHTML = `<div class="loading-message loading"> Tracking order...</div>`;
    const trackingAnimation = document.createElement('div');
    trackingAnimation.style.position = 'relative';
    trackingAnimation.innerHTML = `<div style="background-color:#2d6a4f; border-radius:50%; width:15px; height:15px;"></div>`;
    trackingPanel.appendChild(trackingAnimation);
    setTimeout(() => {
        let currentPosition = 0;
        const animationInterval = setInterval(() => {
            trackingPanel.innerHTML = '';
            currentPosition += 10;
            if (currentPosition > 200) {
                clearInterval(animationInterval);
                trackingPanel.innerHTML = ` <p> Order is now delivered. </p>`;
                return;
            }
            trackingAnimation.style.left = currentPosition + 'px';
            trackingPanel.appendChild(trackingAnimation);
        }, 500);
    }, 2000);
}
