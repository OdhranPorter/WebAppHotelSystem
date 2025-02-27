// login.js

import {
    initializeApp
  } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
  
  import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
  } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
  
  import {
    getFirestore,
    doc,
    setDoc,
    getDoc
  } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";
  
  // REPLACE with your actual config
  const firebaseConfig = {
    apiKey: "AIzaSyDw5aeA0uwE7R06Ht1wjkx6TcehPWs0Hac",
    authDomain: "hotel-booking-3aad3.firebaseapp.com",
    projectId: "hotel-booking-3aad3",
    storageBucket: "hotel-booking-3aad3.firbasestorage.app",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
  };
  
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  
  // Parse ?from= parameter from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const fromPage = urlParams.get("from"); // e.g. "rooms.html" or "/rooms"
  
  // 1) LOGIN FLOW
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value.trim();
  
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("Logged in user:", user.uid);
  
        // Check if user is an Employee
        const empDocRef = doc(db, "Employee", user.uid);
        const empSnap = await getDoc(empDocRef);
  
        if (empSnap.exists()) {
          // It's an employee
          const empData = empSnap.data();
          if (empData.role === "admin") {
            // Admin user
            window.location.href = "admin.html";
          } else {
            // Regular employee
            window.location.href = "employee.html";
          }
        } else {
          // Not in Employee => treat as Guest
          if (fromPage) {
            // If we know the page they came from, go back
            window.location.href = fromPage;
          } else {
            // Otherwise default to home.html
            window.location.href = "home.html";
          }
        }
      } catch (err) {
        console.error("Login error:", err);
        alert(err.message);
      }
    });
  }
  
  // 2) REGISTER (GUEST)
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      const fName = document.getElementById("reg-fName").value.trim();
      const sName = document.getElementById("reg-sName").value.trim();
      const email = document.getElementById("reg-email").value.trim();
      const phone = document.getElementById("reg-phone").value.trim();
      const password = document.getElementById("reg-password").value.trim();
      const role = document.getElementById("reg-role").value.trim(); // likely "guest"
  
      try {
        // 1) Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
  
        // 2) Store doc in "Guest" collection
        await setDoc(doc(db, "Guest", user.uid), {
          fName,
          sName,
          email,
          phoneNum: phone,
          password, // for demonstration only
          role
        });
  
        alert("Guest registered successfully. Please log in!");
        registerForm.reset();
      } catch (err) {
        console.error("Register error:", err);
        alert(err.message);
      }
    });
  }
  