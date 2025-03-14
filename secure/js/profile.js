import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDw5aeA0uwE7R06Ht1wjkx6TcehPWs0Hac",
  authDomain: "hotel-booking-3aad3.firebaseapp.com",
  projectId: "hotel-booking-3aad3",
  storageBucket: "hotel-booking-3aad3.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let logoutBtn = document.getElementById("logout-btn");
// Check user authentication status
onAuthStateChanged(auth, (user) => {
    if (user) {
      const userEmail = user.email;
  
      // Fetch user data from Firestore
      const userRef = doc(db, "Guest", user.uid);
      getDoc(userRef)
        .then((docSnapshot) => {
          if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            document.getElementById("fName").textContent = userData.fName;
            document.getElementById("sName").textContent = userData.sName;
            document.getElementById("email").textContent = userEmail;
            document.getElementById("phoneNum").textContent = userData.phoneNum;
            document.getElementById("role").textContent = userData.role;
          } else {
            console.log("No user data found.");
          }
        })
        .catch((error) => {
          console.error("Error getting user data:", error);
        });
  
    }  
    else {
      // Redirect to login if not logged in
      window.location.href = "/login.html";
    }
  });
  
  //Logout function
  console.log(auth); // Add this line before signOut
 
logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "../home.html";
    });
  