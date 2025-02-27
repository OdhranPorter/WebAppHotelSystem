// rooms.js

import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";

// REPLACE with your actual config:
const firebaseConfig = {
  apiKey: "AIzaSyDw5aeA0uwE7R06Ht1wjkx6TcehPWs0Hac",
  authDomain: "hotel-booking-3aad3.firebaseapp.com",
  projectId: "hotel-booking-3aad3",
  storageBucket: "hotel-booking-3aad3.firebasestorage.app",
  messagingSenderId: "385718256742",
  appId: "1:385718256742:web:03fc7761dbf7e7345ad9a7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/***************************************************
 * Show/Hide nav items based on auth state
 ***************************************************/
document.addEventListener("DOMContentLoaded", async () => {
  console.log("rooms.js loaded");

  // Nav elements
  const accountDropdown = document.getElementById("accountDropdown");
  const accountBtn      = document.getElementById("accountBtn");
  const accountMenu     = document.getElementById("accountMenu");
  const logoutBtn       = document.getElementById("logoutBtn");
  const loginBtn        = document.getElementById("loginBtn");

  // Toggle account menu
  if (accountBtn && accountMenu) {
    accountBtn.addEventListener("click", () => {
      accountMenu.style.display = (accountMenu.style.display === "block") ? "none" : "block";
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "rooms.html";
    });
  }

  // Watch auth state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Logged in => show account, hide login
      if (accountDropdown) accountDropdown.style.display = "inline-block";
      if (loginBtn)        loginBtn.style.display = "none";
    } else {
      // Not logged in => hide account, show login
      if (accountDropdown) accountDropdown.style.display = "none";
      if (loginBtn)        loginBtn.style.display = "inline-block";
    }
  });




  /***************************************************
   * 4. FETCH & DISPLAY ROOMS
   ***************************************************/
  const roomsContainer = document.getElementById("roomsContainer");
  try {
    const querySnapshot = await getDocs(collection(db, "Room"));
    
    querySnapshot.forEach((docSnap) => {
      const roomData = docSnap.data();
      console.log("Room found:", roomData);

      const roomId    = roomData.id || "No ID";
      const roomType  = roomData.type || "Unknown";
      const price     = roomData.price || 0;
      const amenities = roomData.amenities || [];

      // Decide which image to show
      const imagePath = getRoomImagePath(roomType);

      // Create card
      const card = document.createElement("div");
      card.classList.add("room-card");

      // Build amenities list
      const amenitiesList = amenities.map((amenity) => {
        const icon = getAmenityIcon(amenity);
        return `
          <li>
            <img src="${icon}" alt="${amenity}" class="amenity-icon" />
            <span>${amenity}</span>
          </li>
        `;
      }).join("");

      card.innerHTML = `
        <img src="${imagePath}" alt="${roomType}" class="room-image" />
        <h2>${roomType} Room</h2>
        <p>Price: $${price} / night</p>
        <p><strong>Amenities:</strong></p>
        <ul class="amenities-list">
          ${amenitiesList}
        </ul>
        <button>Book Now</button>
      `;

      // Book Now action
      const bookBtn = card.querySelector("button");
      bookBtn.addEventListener("click", () => {
        // Navigate to booking or pass roomId param
        window.location.href = "booking.html?roomId=" + roomId;
      });

      roomsContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    roomsContainer.innerHTML = "<p>Failed to load rooms. Please try again later.</p>";
  }
});

/***************************************************
 * HELPER FUNCTIONS (unchanged)
 ***************************************************/
function getRoomImagePath(roomType) {
  const type = roomType.toLowerCase();
  if (type.includes("deluxe")) return "images/deluxe.jpg";
  if (type.includes("suite")) return "images/suite.jpg";
  if (type.includes("standard")) return "images/standard.jpg";
  if (type.includes("family")) return "images/family.jpg";
  return "images/room_default.jpg";
}

function getAmenityIcon(amenity) {
  const name = amenity.toLowerCase();
  if (name.includes("wi-fi") || name.includes("wifi")) return "images/icon_wifi.png";
  if (name.includes("tv")) return "images/icon_tv.png";
  if (name.includes("mini-bar") || name.includes("mini bar")) return "images/icon_minibar.jpg";
  if (name.includes("room service")) return "images/icon_service.png";
  if (name.includes("air conditioning") || name.includes("aircon")) return "images/icon_aircon.png";
  if (name.includes("crib")) return "images/icon_crib.png";
  if (name.includes("towels")) return "images/icon_towels.png";
  return "images/icon_amenity.png";
}

  // If the user clicks "Book Now" for a specific room:
  bookNowBtn.addEventListener("click", () => {
    const roomId = "R101"; // or retrieve dynamically
    if (!auth.currentUser) {
      window.location.href = "login.html?from=booking.html?roomId=" + roomId;
    } else {
      window.location.href = "booking.html?roomId=" + roomId;
    }
  });
