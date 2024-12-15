// Combined JavaScript file (auth.js, order.js, app.js, utils.js combined)

//------ utils.js content ------
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
const feedbackMessages = JSON.parse(localStorage.getItem('feedbackMessages')) || [];

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhoneNumber(phone) {
    const phoneRegex = /^[+]?[\d\s-]*$/;
    const cleanedPhone = phone.replace(/[\s-]/g, '');
    if (!phoneRegex.test(phone.trim())) {
        return false
    }
    return cleanedPhone.length >= 7;
}

function toggleVisibility(hideSection, showSection) {
    document.getElementById(hideSection).style.display = 'none';
    document.getElementById(showSection).style.display = 'block';
}

function clearInput(inputId) {
    document.getElementById(inputId).value = '';
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
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

function updateMap() {
    const location = currentUser.location || 'Location Not Set';
      document.getElementById('userLocationDisplay').innerText = location;
    // Basic placeholder map (replace with actual map API)
}

function submitFeedback(event) {
    event.preventDefault();
    const feedbackMessage = document.getElementById('feedbackMessage').value.trim();
    const feedbackStatus = document.getElementById('feedbackStatus');
    feedbackStatus.classList.add('loading');
    feedbackStatus.innerText = 'Sending feedback...';
    setTimeout(() => {
        feedbackMessages.push(
            {
                user: currentUser.email,
                message: feedbackMessage
            }
        )
        feedbackStatus.classList.remove('loading');
        feedbackStatus.innerText = 'Feedback Sent!';
        localStorage.setItem('feedbackMessages', JSON.stringify(feedbackMessages));
        document.getElementById('feedbackForm').reset()
         notifyUser("Feedback sent!");
    }, 1500);
}
 function loadFaq(){
        const faqListElement = document.getElementById('faqList');
         faqListElement.innerHTML ='';
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
        ]
       faqData.forEach(faq =>{
         const faqElement = document.createElement('div');
             faqElement.innerHTML =
                 `
             <p>Q: ${faq.question}</p>
             <p>A: ${faq.answer}</p>
             <hr/>
            `
        faqListElement.appendChild(faqElement);
        })
 }
 function loadPreferences(){
      const userPreferences = JSON.parse(localStorage.getItem('userPreferences')) || {}
      if(userPreferences.language) {
       document.getElementById('languageSelect').value = userPreferences.language
      }
 }
function savePreferences(){
     const languageSelect = document.getElementById('languageSelect').value;
     const userPreferencesStatus =  document.getElementById('userPreferencesStatus');
     userPreferencesStatus.classList.add('loading');
      userPreferencesStatus.innerText = 'Saving preferences...';
      setTimeout(() =>{
            userPreferencesStatus.classList.remove('loading');
             userPreferencesStatus.innerText ='Preferences Saved!';
              const userPreferences ={
                  language: languageSelect
            }
        localStorage.setItem('userPreferences',JSON.stringify(userPreferences));
     }, 1500);
}
function notifyUser(message){
      if('Notification' in window){
          Notification.requestPermission().then(permission =>{
            if(permission === 'granted'){
                 new Notification('Click n Go!',{
                    body: message,
                 })
            }
          })
      }
}


//------ auth.js content ------
let generatedOTP = "";

function signUp(event) {
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
        document.getElementById('signUpPhoneError').innerText = 'Invalid Phone number.'
        return;
    } else {
        document.getElementById('signUpPhoneError').innerText = '';
    }

    currentUser = { email, location, phone, role };
    generatedOTP = generateOTP();
    document.getElementById('otpMessage').innerText = `Your OTP is: ${generatedOTP}`;
    document.getElementById('authMessage').innerText = 'Sign up successful! Check your OTP.';
    toggleVisibility('authSection', 'otpPage');
}

function verifyOTP() {
    const otpInput = document.getElementById('otpInput').value.trim();
    const otpStatus = document.getElementById('otpStatus');
    const otpError = document.getElementById('otpError');
    otpStatus.classList.add('loading');
    otpStatus.innerText = 'Verifying OTP...';
    setTimeout(() => {
        otpStatus.classList.remove('loading');
        if (otpInput === generatedOTP.toString()) {
            otpStatus.innerText = '';
            otpError.innerText = '';
            document.getElementById('authMessage').innerText = 'OTP Verified!';
            toggleVisibility('otpPage', 'appSection');
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            populateAccountInfo();
             if (currentUser.role === 'admin') {
                  //Admin view now in account
                   switchSection('account');
                   loadAllUsers();
            } else {
                 switchSection('home')
                displayDashboard(currentUser.role);
                 updateMap();
            }
        } else {
            otpStatus.innerText = '';
            otpError.innerText = 'Invalid OTP. Try again.';
        }
    }, 1500);

}

function login(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!isValidEmail(email)) {
        document.getElementById('loginEmailError').innerText = 'Invalid Email format.';
        return;
    } else {
        document.getElementById('loginEmailError').innerText = '';
    }

    if (password.length < 6) {
        document.getElementById('loginPasswordError').innerText = 'Password must be at least 6 characters.';
        return;
    } else {
        document.getElementById('loginPasswordError').innerText = '';
    }

    document.getElementById('authMessage').innerText = 'Logging in...';
    setTimeout(() => {
        currentUser = { ...currentUser, email };
        document.getElementById('authMessage').innerText = 'Login Successful!';
        toggleVisibility('authSection', 'appSection');
         if (rememberMe) {
           localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } else {
           sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        populateAccountInfo();
        loadPreferences();
          if (currentUser.role === 'admin') {
             //Admin view now in account
             switchSection('account');
               loadAllUsers();
        } else {
           switchSection('home')
            displayDashboard(currentUser.role);
             updateMap();
        }
    }, 1500);
}

function populateAccountInfo() {
    document.getElementById('accountEmail').innerText = currentUser.email || "Not Provided";
    document.getElementById('accountLocation').innerText = currentUser.location || "Not Provided";
    document.getElementById('accountPhone').innerText = currentUser.phone || "Not Provided";
    document.getElementById('userEmailDisplay').innerText = currentUser.email || "User";
    document.getElementById('userRole').innerText = currentUser.role || "Not Provided";
}

function resetApp() {
    currentUser = {};
    generatedOTP = "";
    document.getElementById('signupFormElem').reset();
    document.getElementById('loginFormElem').reset();
    document.getElementById('otpInput').value = "";
    toggleVisibility('appSection', 'authSection');
    document.querySelectorAll('.error-message').forEach(item => item.innerHTML = '');
}

function toggleAuth(formId) {
    document.getElementById('signUpForm').style.display = formId === 'signUpForm' ? 'block' : 'none';
    document.getElementById('loginForm').style.display = formId === 'loginForm' ? 'block' : 'none';
    document.getElementById('authMessage').innerText = '';
}

function logout() {
   document.getElementById('authMessage').innerText = 'Logged out successfully!';
      resetApp();
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
}

function deleteAccount() {
    if (confirm('Are you sure you want to delete your account?')) {
        document.getElementById('authMessage').innerText = 'Account deleted!';
       resetApp();
          localStorage.removeItem('currentUser');
         sessionStorage.removeItem('currentUser');
    }
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}

async function loadAllUsers() {
    const allUsersElement = document.getElementById('allUsers');
     allUsersElement.innerHTML = '<div class="loading-message loading">Loading users...</div>';
    setTimeout(() => {
        allUsersElement.innerHTML = '';
        const storedUsers = JSON.parse(localStorage.getItem('allUsers')) || [];
          storedUsers.push(currentUser)
        storedUsers.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.innerHTML =
                `
             <p>Email: ${user.email}</p>
             <p>Location: ${user.location}</p>
             <p>Phone Number: ${user.phone}</p>
             <p>Role: ${user.role}</p>
             <hr />
            `;
            allUsersElement.appendChild(userDiv)
        });
        localStorage.setItem('allUsers', JSON.stringify(storedUsers));
    }, 1500)
}

//------ order.js content ------
function simulateOrder() {
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    const newOrder = {
        date: new Date().toDateString(),
        items: "Test Order",
        status: "Pending"
    }
    orders.push(newOrder)
    localStorage.setItem('orders', JSON.stringify(orders));
      notifyUser("Order Placed!");
    updateTracking();
    alert('Order Received! Check order history.')
}

function showOrderHistory() {
    switchSection('orderHistory')
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    const orderList = document.getElementById('orderList');
    orderList.innerHTML = '';
    if (orders.length === 0) {
        orderList.innerHTML = 'No previous orders.'
    }
    orders.forEach((order, index) => {
        const orderElement = document.createElement('div');
        orderElement.innerHTML =
            `
            <p>Order #${index + 1}:</p>
            <p>Date: ${order.date}</p>
            <p>Item: ${order.items}</p>
            <p>Status: ${order.status}</p>
            <hr />
        `
        orderList.appendChild(orderElement)
    })
}
function updateTracking(){
   const trackingPanel = document.getElementById('trackingPanel');
    trackingPanel.innerHTML = `<div class="loading-message loading"> Tracking order...</div>`;
    const trackingAnimation = document.createElement('div');
    trackingAnimation.style.position ='relative';
      trackingAnimation.innerHTML =  `<div style="background-color:#2d6a4f; border-radius:50%; width:15px; height:15px;"></div>`;
        trackingPanel.appendChild(trackingAnimation);
    setTimeout(() => {
        let currentPosition = 0;
        const animationInterval = setInterval(() => {
              trackingPanel.innerHTML ='';
             currentPosition += 10;
            if(currentPosition > 200){
                  clearInterval(animationInterval)
                  trackingPanel.innerHTML = ` <p> Order is now delivered. </p>`
                  return;
              }
             trackingAnimation.style.left = currentPosition + 'px'
              trackingPanel.appendChild(trackingAnimation)
        },500)
    },2000);

}


//------ app.js content ------
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
]

document.addEventListener('DOMContentLoaded', () => {
    if (currentUser && currentUser.email) {
        toggleVisibility('authSection', 'appSection');
        populateAccountInfo();
        loadPreferences();
        if (currentUser.role === 'admin') {
            // Admin view is now in account
        }
        else {
            switchSection('home')
            displayDashboard(currentUser.role);
            updateMap();
        }
    }
    else {
        switchSection('home')
    }
      loadFaq();
    updateClock();
    displayWelcomeMessage();
    setInterval(updateClock, 1000);
});


function switchSection(section) {
    document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
     if(section === 'admin' && currentUser.role !== 'admin'){
          document.getElementById('homeSection').style.display = 'block';
        document.getElementById('authMessage').innerText = "You are not authorize to access this page.";
        return;
    }
      if(section === 'account' && currentUser.role === 'admin'){
         document.getElementById('adminSection').style.display = 'block';
          loadAllUsers();
    }
      else{
          document.getElementById('adminSection').style.display = 'none';
      }
    document.getElementById(section + 'Section').style.display = 'block';
      document.getElementById('authMessage').innerText = '';
       if(section === 'orderItems'){
            updateMap();
             loadChatMessages();
      }
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


// Attach event listeners
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('signupFormElem').addEventListener('submit', signUp);
  document.getElementById('loginFormElem').addEventListener('submit', login)
});

// Make switchSection, logout, deleteAccount, toggleDarkMode and clearInput available to the window object
window.switchSection = switchSection;
window.logout = logout;
window.deleteAccount = deleteAccount;
window.toggleDarkMode = toggleDarkMode;
window.clearInput = clearInput;
window.verifyOTP = verifyOTP;
window.savePreferences = savePreferences;
window.submitFeedback = submitFeedback;
window.simulateOrder = simulateOrder;
window.showOrderHistory = showOrderHistory;
window.sendMessage = sendMessage;


//----- chat function ------
function loadChatMessages() {
    const chatMessages = JSON.parse(localStorage.getItem('chatMessages')) || [];
    const chatMessagesDiv = document.getElementById('chatMessages');
    chatMessagesDiv.innerHTML = '';
    chatMessages.forEach(message => {
        const messageDiv = document.createElement('div');
           messageDiv.textContent = message.text;
          messageDiv.classList.add('message');
           if(message.sender === currentUser.email) {
               messageDiv.classList.add('own')
           }
        chatMessagesDiv.appendChild(messageDiv);
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    });
}

function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const messageText = chatInput.value.trim();
    if (messageText === '') return;

    const chatMessages = JSON.parse(localStorage.getItem('chatMessages')) || [];
    const newMessage = {
        sender: currentUser.email,
        text: messageText,
        timestamp: new Date()
    };
    chatMessages.push(newMessage);
    localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
    chatInput.value = '';
    loadChatMessages();
}
