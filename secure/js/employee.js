// employee.js

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

// Firebase init
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

// DOM references
const accountDropdown = document.getElementById("accountDropdown");
const accountBtn = document.getElementById("accountBtn");
const accountMenu = document.getElementById("accountMenu");
const logoutBtn = document.getElementById("logoutBtn");
const loginBtn = document.getElementById("loginBtn");
const amenityForm = document.getElementById("amenityForm");
const amenitiesList = document.getElementById("amenitiesList");
const roomTypesList = document.getElementById("roomTypesList");
const bookingsTableBody = document.querySelector("#bookingsTable tbody");

// Modal references
const editTypeModal = document.getElementById("editTypeModal");
const editTypeForm = document.getElementById("editTypeForm");
const span = document.getElementsByClassName("close")[0];

// Global variables
let currentEditingType = null;

// Auth state listener
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login?from=employee";
    return;
  }

  const empSnap = await getDoc(doc(db, "Employee", user.uid));
  if (!empSnap.exists() || (empSnap.data().role !== "employee" && empSnap.data().role !== "admin")) {
    alert("Access denied - not an Employee or Admin");
    window.location.href = "home";
    return;
  }

  // Show account dropdown and hide login button
  if (accountDropdown) accountDropdown.style.display = "inline-block";
  if (loginBtn) loginBtn.style.display = "none";

  // Load data
  loadRoomTypesWithRooms();
  loadAllBookings();
  loadAmenities();
});

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
    window.location.href = "home";
  });
}

// Modal handling
span.onclick = () => editTypeModal.style.display = "none";
window.onclick = (event) => {
  if (event.target == editTypeModal) editTypeModal.style.display = "none";
};

// Load room types with their rooms
async function loadRoomTypesWithRooms() {
  roomTypesList.innerHTML = "";
  
  const [roomsSnapshot, typesSnapshot] = await Promise.all([
    getDocs(collection(db, "Room")),
    getDocs(collection(db, "RoomType"))
  ]);

  const roomsByType = {};
  const typeDataMap = new Map();

  // Store type data
  typesSnapshot.forEach(doc => {
    typeDataMap.set(doc.id, doc.data());
  });

  // Group rooms by type
  roomsSnapshot.forEach(doc => {
    const room = doc.data();
    if (!roomsByType[room.type]) {
      roomsByType[room.type] = {
        rooms: [],
        typeData: typeDataMap.get(room.type) || {}
      };
    }
    roomsByType[room.type].rooms.push(room);
  });

  // Create UI for each room type
  for (const [typeName, { rooms, typeData }] of Object.entries(roomsByType)) {
    const typeContainer = document.createElement("div");
    typeContainer.className = "room-type-card";
    
    const roomNumbers = rooms.map(room => 
      parseInt(room.id.replace(/^\D+/g, '')) || 0
    );
    const maxRoomNumber = Math.max(...roomNumbers);

    typeContainer.innerHTML = `
      <div class="room-type-header">
        <h3>${typeName} Rooms (€${typeData.price}/night)</h3>
        <div>
          <button class="edit-type-btn" data-type="${typeName}">Edit Type</button>
          <button class="create-room-btn" data-type="${typeName}" data-next="${maxRoomNumber + 1}">
            + Add Room
          </button>
        </div>
      </div>
      <div class="rooms-list">
        ${rooms.map(room => `
          <div class="room-item">
            <div class="room-details">
              <div class="room-id">${room.id}</div>
              <div class="room-amenities">${(typeData.amenities || []).join(', ')}</div>
              <div class="room-status ${room.status || 'available'}">
                ${room.status || 'available'}
              </div>
            </div>
            <button class="action-btn delete" data-id="${room.id}">Delete</button>
          </div>
        `).join('')}
      </div>
    `;

    // Add edit type handler
    typeContainer.querySelector('.edit-type-btn').addEventListener('click', () => {
      showEditTypeModal(typeName, typeData);
    });

    // Add create room handler
    typeContainer.querySelector('.create-room-btn').addEventListener('click', async (e) => {
      const type = e.target.dataset.type;
      const nextNumber = parseInt(e.target.dataset.next);
      const newRoomId = `${type === "Standard" ? "SD" : type.charAt(0).toUpperCase()}${nextNumber.toString().padStart(3, '0')}`;

      try {
        await setDoc(doc(db, "Room", newRoomId), {
          id: newRoomId,
          type: type,
          status: "available"
        });
        e.target.dataset.next = nextNumber + 1;
        loadRoomTypesWithRooms(); // Refresh list
      } catch (err) {
        alert("Error creating room: " + err.message);
      }
    });

    // Add delete room handlers
    typeContainer.querySelectorAll('.delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const roomId = btn.dataset.id;
        if (confirm(`Delete room ${roomId}?`)) {
          await deleteDoc(doc(db, "Room", roomId));
          loadRoomTypesWithRooms();
        }
      });
    });

    roomTypesList.appendChild(typeContainer);
  }
}

// Show edit type modal
async function showEditTypeModal(typeName, typeData) {
  currentEditingType = typeName;
  const amenitiesSnap = await getDocs(collection(db, "Amenity"));
  
  // Clear previous content
  document.getElementById("editTypeAmenities").innerHTML = '';
  document.getElementById("editTypeImagePreview").innerHTML = '';

  // Populate form
  document.getElementById("editTypeName").value = typeName;
  document.getElementById("editTypePrice").value = typeData.price || 0;

  // Add amenities checkboxes
  amenitiesSnap.forEach(doc => {
    const amenityId = doc.id;
    const label = document.createElement("label");
    label.innerHTML = `
      <input type="checkbox" value="${amenityId}" 
        ${(typeData.amenities || []).includes(amenityId) ? 'checked' : ''}>
      <img src="${doc.data().image}" alt="${amenityId}">
      ${amenityId}
    `;
    document.getElementById("editTypeAmenities").appendChild(label);
  });

  // Show existing images
  (typeData.images || []).forEach(img => {
    const imgElem = document.createElement("img");
    imgElem.src = img;
    document.getElementById("editTypeImagePreview").appendChild(imgElem);
  });

  editTypeModal.style.display = "block";
}

// Handle type editing
editTypeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const newName = document.getElementById("editTypeName").value.trim();
  const price = parseFloat(document.getElementById("editTypePrice").value);
  const amenities = Array.from(document.querySelectorAll('#editTypeAmenities input:checked'))
    .map(input => input.value);
  const files = Array.from(document.getElementById("editTypeImages").files);

  try {
    // Upload new images
    const existingImages = Array.from(document.getElementById("editTypeImagePreview").children)
      .map(img => img.src);
    const newImages = await Promise.all(files.map(file => 
      new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      })
    ));
    
    const allImages = [...existingImages, ...newImages];

    // Update type document
    await setDoc(doc(db, "RoomType", currentEditingType), {
      price,
      amenities,
      images: allImages
    }, { merge: true });

    // Handle name change
    if (newName !== currentEditingType) {
      // Update all rooms of this type
      const roomsSnap = await getDocs(query(
        collection(db, "Room"), 
        where("type", "==", currentEditingType)
      ));

      const batch = writeBatch(db);
      roomsSnap.forEach(doc => {
        batch.update(doc.ref, { type: newName });
      });
      await batch.commit();

      // Rename the type document
      await setDoc(doc(db, "RoomType", newName), {
        price,
        amenities,
        images: allImages
      });
      await deleteDoc(doc(db, "RoomType", currentEditingType));
    }

    editTypeModal.style.display = "none";
    loadRoomTypesWithRooms();
  } catch (err) {
    alert("Error updating room type: " + err.message);
  }
});

// Load amenities with enhanced deletion
async function loadAmenities() {
  const snap = await getDocs(collection(db, "Amenity"));
  amenitiesList.innerHTML = "";

  snap.forEach(amenityDoc => {
    const div = document.createElement("div");
    div.className = "amenity-item";
    div.innerHTML = `
      <img src="${amenityDoc.data().image}" alt="${amenityDoc.id}">
      <span>${amenityDoc.id}</span>
      <button class="delete-amenity" data-id="${amenityDoc.id}">&times;</button>
    `;

    // Delete amenity handler
    div.querySelector('.delete-amenity').addEventListener('click', async (e) => {
      e.stopPropagation();
      const amenityId = e.currentTarget.dataset.id;

      if (confirm(`Delete amenity ${amenityId}? This will remove it from all room types!`)) {
        try {
          const amenityRef = doc(db, "Amenity", amenityId);
          await deleteDoc(amenityRef);
          await removeAmenityFromRoomTypes(amenityId);
          loadAmenities();
          loadRoomTypesWithRooms();
        } catch (error) {
          console.error("Deletion error:", error);
          alert(`Failed to delete amenity: ${error.message}`);
        }
      }
    });

    amenitiesList.appendChild(div);
  });
}

// Handle amenity creation
if (amenityForm) {
  amenityForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("amenityName").value.trim();
    const file = document.getElementById("amenityImage").files[0];
    
    if (!name || !file) return;
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await setDoc(doc(db, "Amenity", name), {
          image: reader.result
        });
        loadAmenities();
        amenityForm.reset();
      } catch (err) {
        alert("Error creating amenity: " + err.message);
      }
    };
    reader.readAsDataURL(file);
  });
}

// Clean up room type references
async function removeAmenityFromRoomTypes(amenityId) {
  const roomTypesSnap = await getDocs(collection(db, "RoomType"));
  const batch = writeBatch(db);

  roomTypesSnap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.amenities?.includes(amenityId)) {
      const updatedAmenities = data.amenities.filter(a => a !== amenityId);
      batch.update(docSnap.ref, { amenities: updatedAmenities });
    }
  });

  await batch.commit();
}

// Load all bookings
async function loadAllBookings() {
  bookingsTableBody.innerHTML = "";
  const snap = await getDocs(collection(db, "Booking"));
  const bookings = [];

  for (const bDoc of snap.docs) {
    const b = bDoc.data();
    const bookingId = bDoc.id;
    const guestID = b.guestID || "";
    let guestName = "";
    let guestEmail = "";
    let guestPhone = "";

    if (guestID) {
      const gSnap = await getDoc(doc(db, "Guest", guestID));
      if (gSnap.exists()) {
        const gData = gSnap.data();
        guestName = `${gData.fName || ""} ${gData.sName || ""}`.trim() || 'N/A';
        guestEmail = gData.email || 'N/A';
        guestPhone = gData.phoneNum || 'N/A';
      }
    }

    bookings.push({
      data: b,
      bookingId,
      guestName,
      guestEmail,
      guestPhone,
      checkInDate: b.checkInDate || "",
      status: b.status || "unpaid"
    });
  }

  // Sort bookings: unpaid first, then by check-in date
  bookings.sort((a, b) => {
    if (a.status === "unpaid" && b.status !== "unpaid") return -1;
    if (b.status === "unpaid" && a.status !== "unpaid") return 1;
    return new Date(a.checkInDate) - new Date(b.checkInDate);
  });

  // Populate table
  bookings.forEach(b => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${b.bookingId}</td>
      <td>${b.data.roomID}</td>
      <td>${b.checkInDate}</td>
      <td>${b.data.checkOutDate}</td>
      <td>${b.guestName}</td>
      <td>${b.guestEmail}</td>
      <td>${b.guestPhone}</td>
      <td>${b.status}</td>
    `;
    bookingsTableBody.appendChild(row);
  });
}