// employee.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, query, where, writeBatch } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

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

// DOM references for account and others
const accountDropdown = document.getElementById("accountDropdown");
const accountBtn = document.getElementById("accountBtn");
const accountMenu = document.getElementById("accountMenu");
const logoutBtn = document.getElementById("logoutBtn");
const loginBtn = document.getElementById("loginBtn");
const amenityForm = document.getElementById("amenityForm");
const amenitiesList = document.getElementById("amenitiesList");
const roomTypesList = document.getElementById("roomTypesList");
const bookingsTableBody = document.querySelector("#bookingsTable tbody");

// Modal references for editing room type
const editTypeModal = document.getElementById("editTypeModal");
const editTypeForm = document.getElementById("editTypeForm");
const editTypeAmenities = document.getElementById("editTypeAmenities");
const editTypeImagePreview = document.getElementById("editTypeImagePreview");
const editTypeName = document.getElementById("editTypeName");
const editTypePrice = document.getElementById("editTypePrice");
const editTypeImages = document.getElementById("editTypeImages");
const closeSpan = document.getElementsByClassName("close")[0];

// Extras section DOM references
const extrasList = document.getElementById("extrasList");
const addExtraForm = document.getElementById("addExtraForm");
const editExtraModal = document.getElementById("editExtraModal");
const editExtraForm = document.getElementById("editExtraForm");
const closeEditExtraModal = document.getElementById("closeEditExtraModal");

let currentEditingType = null;
let currentEditingExtra = null;

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

  // Load all data sections
  loadRoomTypesWithRooms();
  loadAllBookings();
  loadAmenities();
  loadExtras();
});

// Toggle account menu
if (accountBtn && accountMenu) {
  accountBtn.addEventListener("click", () => {
    accountMenu.style.display = (accountMenu.style.display === "block") ? "none" : "block";
  });
}

// Logout functionality
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "home";
  });
}

// Modal handling for room type edit modal and extra edit modal
closeSpan.onclick = () => editTypeModal.style.display = "none";
closeEditExtraModal.onclick = () => editExtraModal.style.display = "none";
window.onclick = (event) => {
  if (event.target == editTypeModal) editTypeModal.style.display = "none";
  if (event.target == editExtraModal) editExtraModal.style.display = "none";
};

// ==============================
// Room Types & Rooms Functions
// ==============================

async function loadRoomTypesWithRooms() {
  roomTypesList.innerHTML = "";
  
  const [roomsSnapshot, typesSnapshot] = await Promise.all([
    getDocs(collection(db, "Room")),
    getDocs(collection(db, "RoomType"))
  ]);

  const roomsByType = {};
  const typeDataMap = new Map();

  typesSnapshot.forEach(docSnap => {
    typeDataMap.set(docSnap.id, docSnap.data());
  });

  roomsSnapshot.forEach(docSnap => {
    const room = docSnap.data();
    if (!roomsByType[room.type]) {
      roomsByType[room.type] = { rooms: [], typeData: typeDataMap.get(room.type) || {} };
    }
    roomsByType[room.type].rooms.push(room);
  });

  for (const [typeName, { rooms, typeData }] of Object.entries(roomsByType)) {
    const typeContainer = document.createElement("div");
    typeContainer.className = "room-type-card";
    
    const roomNumbers = rooms.map(room => parseInt(room.id.replace(/^\D+/g, '')) || 0);
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

    // Edit type handler
    typeContainer.querySelector('.edit-type-btn').addEventListener('click', () => {
      showEditTypeModal(typeName, typeData);
    });

    // Create room handler
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
        loadRoomTypesWithRooms();
      } catch (err) {
        alert("Error creating room: " + err.message);
      }
    });

    // Delete room handlers
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

async function showEditTypeModal(typeName, typeData) {
  currentEditingType = typeName;
  const amenitiesSnap = await getDocs(collection(db, "Amenity"));
  
  editTypeAmenities.innerHTML = '';
  editTypeImagePreview.innerHTML = '';

  editTypeName.value = typeName;
  editTypePrice.value = typeData.price || 0;

  amenitiesSnap.forEach(docSnap => {
    const amenityId = docSnap.id;
    const label = document.createElement("label");
    label.innerHTML = `
      <input type="checkbox" value="${amenityId}" ${(typeData.amenities || []).includes(amenityId) ? 'checked' : ''}>
      <img src="${docSnap.data().image}" alt="${amenityId}">
      ${amenityId}
    `;
    editTypeAmenities.appendChild(label);
  });

  (typeData.images || []).forEach(img => {
    const imgElem = document.createElement("img");
    imgElem.src = img;
    editTypeImagePreview.appendChild(imgElem);
  });

  editTypeModal.style.display = "block";
}

editTypeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const newName = editTypeName.value.trim();
  const price = parseFloat(editTypePrice.value);
  const amenities = Array.from(document.querySelectorAll('#editTypeAmenities input:checked'))
    .map(input => input.value);
  const files = Array.from(editTypeImages.files);

  try {
    const existingImages = Array.from(editTypeImagePreview.children).map(img => img.src);
    const newImages = await Promise.all(files.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    })));
    const allImages = [...existingImages, ...newImages];

    await setDoc(doc(db, "RoomType", currentEditingType), {
      price,
      amenities,
      images: allImages
    }, { merge: true });

    if (newName !== currentEditingType) {
      const roomsSnap = await getDocs(query(collection(db, "Room"), where("type", "==", currentEditingType)));
      const batch = writeBatch(db);
      roomsSnap.forEach(docSnap => {
        batch.update(docSnap.ref, { type: newName });
      });
      await batch.commit();

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

// ==============================
// Amenities Functions
// ==============================

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

    div.querySelector('.delete-amenity').addEventListener('click', async (e) => {
      e.stopPropagation();
      const amenityId = e.currentTarget.dataset.id;
      if (confirm(`Delete amenity ${amenityId}? This will remove it from all room types!`)) {
        try {
          await deleteDoc(doc(db, "Amenity", amenityId));
          await removeAmenityFromRoomTypes(amenityId);
          loadAmenities();
          loadRoomTypesWithRooms();
        } catch (error) {
          alert(`Failed to delete amenity: ${error.message}`);
        }
      }
    });

    amenitiesList.appendChild(div);
  });
}

if (amenityForm) {
  amenityForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("amenityName").value.trim();
    const file = document.getElementById("amenityImage").files[0];
    if (!name || !file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await setDoc(doc(db, "Amenity", name), { image: reader.result });
        amenityForm.reset();
        loadAmenities();
      } catch (err) {
        alert("Error creating amenity: " + err.message);
      }
    };
    reader.readAsDataURL(file);
  });
}

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

// ==============================
// Bookings Functions
// ==============================

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

  bookings.sort((a, b) => {
    if (a.status === "unpaid" && b.status !== "unpaid") return -1;
    if (b.status === "unpaid" && a.status !== "unpaid") return 1;
    return new Date(a.checkInDate) - new Date(b.checkInDate);
  });

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

// ==============================
// Extras Functions
// ==============================

async function loadExtras() {
  extrasList.innerHTML = "";
  const extrasSnap = await getDocs(collection(db, "Extras"));
  
  extrasSnap.forEach(docSnap => {
    const extra = docSnap.data();
    const extraId = docSnap.id;
    
    const extraCard = document.createElement("div");
    extraCard.className = "room-type-card";
    extraCard.innerHTML = `
      <div class="room-type-header">
        <h3>${extraId} Extras (€${extra.price})</h3>
        <div>
          <button class="edit-extra-btn" data-id="${extraId}">Edit Extra</button>
          <button class="delete-extra-btn" data-id="${extraId}">Delete Extra</button>
        </div>
      </div>
      <div class="rooms-list">
        <div class="room-item">
          <div class="room-details">
            <div class="room-id"><strong>Name:</strong> ${extra.name}</div>
            <div class="room-status">Price: €${extra.price}</div>
          </div>
        </div>
      </div>
    `;

    extraCard.querySelector('.edit-extra-btn').addEventListener('click', () => {
      showEditExtraModal(extraId, extra);
    });

    extraCard.querySelector('.delete-extra-btn').addEventListener('click', async () => {
      if (confirm(`Delete extra ${extraId}?`)) {
        await deleteDoc(doc(db, "Extras", extraId));
        loadExtras();
      }
    });

    extrasList.appendChild(extraCard);
  });
}

function showEditExtraModal(extraId, extraData) {
  currentEditingExtra = extraId;
  document.getElementById("editExtraId").value = extraId;
  document.getElementById("editExtraName").value = extraData.name || "";
  document.getElementById("editExtraPrice").value = extraData.price || 0;
  editExtraModal.style.display = "block";
}

editExtraForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const extraId = document.getElementById("editExtraId").value.trim();
  const name = document.getElementById("editExtraName").value.trim();
  const price = parseFloat(document.getElementById("editExtraPrice").value);
  try {
    await setDoc(doc(db, "Extras", extraId), { name, price }, { merge: true });
    editExtraModal.style.display = "none";
    loadExtras();
  } catch (err) {
    alert("Error updating extra: " + err.message);
  }
});

if (addExtraForm) {
  addExtraForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const extraId = document.getElementById("newExtraId").value.trim();
    const name = document.getElementById("newExtraName").value.trim();
    const price = parseFloat(document.getElementById("newExtraPrice").value);
    try {
      await setDoc(doc(db, "Extras", extraId), { name, price });
      addExtraForm.reset();
      loadExtras();
    } catch (err) {
      alert("Error adding extra: " + err.message);
    }
  });
}
