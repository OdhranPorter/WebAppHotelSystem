import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDw5aeA0uwE7R06Ht1wjkx6TcehPWs0Hac",
    authDomain: "hotel-booking-3aad3.firebaseapp.com",
    projectId: "hotel-booking-3aad3",
    storageBucket: "hotel-booking-3aad3.firebasestorage.app",
    messagingSenderId: "385718256742",
    appId: "1:385718256742:web:03fc7761dbf7e7345ad9a7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentAction = null;

// Modal handling
const modals = document.querySelectorAll('.modal');
const codeModal = document.getElementById('codeModal');
const passwordModal = document.getElementById('passwordModal');

document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.onclick = () => modals.forEach(m => m.style.display = 'none');
});

window.onclick = (event) => {
    if (event.target.classList.contains('modal')) {
        modals.forEach(m => m.style.display = 'none');
    }
};

// Profile data loading
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // Load personal details
        const userDoc = await getDoc(doc(db, "Guest", user.uid));
        if (!userDoc.exists()) return;

        const userData = userDoc.data();
        document.getElementById('displayName').textContent = 
            `${userData.fName} ${userData.sName}`;
        document.getElementById('displayEmail').textContent = user.email;
        document.getElementById('displayPhone').textContent = userData.phoneNum || 'N/A';

        // Load bookings
        const bookingsQuery = query(collection(db, "Booking"), where("guestID", "==", user.uid));
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsList = document.getElementById('bookingsList');
        bookingsList.innerHTML = '';

        if (bookingsSnapshot.empty) {
            bookingsList.innerHTML = '<p class="no-bookings">No upcoming bookings found</p>';
            return;
        }

        for (const bookingDoc of bookingsSnapshot.docs) {
            try {
                const booking = bookingDoc.data();
                const roomDoc = await getDoc(doc(db, "Room", booking.roomID));
                const roomData = roomDoc.data();
                const typeDoc = await getDoc(doc(db, "RoomType", roomData.type));
                const typeData = typeDoc.data();

                const bookingCard = createBookingCard(
                    booking,
                    roomData.type,
                    typeData,
                    bookingDoc.id
                );
                
                bookingsList.appendChild(bookingCard);
            } catch (error) {
                console.error("Error processing booking:", error);
            }
        }

    } catch (error) {
        console.error("Error loading profile:", error);
        bookingsList.innerHTML = '<p class="error-msg">Error loading bookings. Please refresh.</p>';
    }
});

function createBookingCard(booking, roomType, typeData, bookingId) {
    const card = document.createElement('div');
    card.className = `booking-card ${booking.status}`;

    card.innerHTML = `
        <div class="booking-image-container">
            <img src="${typeData.images[0]}" alt="${roomType} Room" class="booking-image">
        </div>
        <div class="booking-details">
            <h3 class="booking-type">${roomType} Room</h3>
            <p class="booking-dates">${formatDate(booking.checkInDate)} - ${formatDate(booking.checkOutDate)}</p>
            <div class="booking-status ${booking.status}">${booking.status.toUpperCase()}</div>
            <ul class="amenities-list">
                ${typeData.amenities.map(amenity => `
                    <li>
                        <img src="${getAmenityIcon(amenity)}" class="amenity-icon" alt="${amenity}">
                        ${amenity}
                    </li>
                `).join('')}
            </ul>
            <button class="cancel-btn" onclick="cancelBooking('${bookingId}')">
                Cancel Booking
            </button>
        </div>
    `;

    return card;
}

function getAmenityIcon(amenity) {
    const name = amenity.toLowerCase();
    const icons = {
        wifi: 'images/icon_wifi.png',
        tv: 'images/icon_tv.png',
        'mini-bar': 'images/icon_minibar.jpg',
        'room service': 'images/icon_service.png',
        'air conditioning': 'images/icon_aircon.png',
        crib: 'images/icon_crib.png',
        towels: 'images/icon_towels.png'
    };
    return icons[name] || 'images/icon_amenity.png';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

// Password visibility toggle
window.togglePassword = async () => {
    currentAction = 'showPassword';
    codeModal.style.display = 'block';
    await sendVerificationCode();
};

async function sendVerificationCode() {
    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        alert('Verification code "sent" to your email\nUse test code: 123456');
    } catch (error) {
        alert('Verification system error');
    }
}

window.submitCode = async function() {
    const enteredCode = document.getElementById('verificationCode').value;
    
    if (enteredCode === "123456") {
        codeModal.style.display = 'none';
        
        if (currentAction === 'showPassword') {
            const userDoc = await getDoc(doc(db, "Guest", auth.currentUser.uid));
            document.getElementById('displayPass').textContent = userDoc.data().password;
            setTimeout(() => {
                document.getElementById('displayPass').textContent = '********';
            }, 30000);
        } else if (currentAction === 'changePassword') {
            passwordModal.style.display = 'block';
        }
    } else {
        document.getElementById('codeError').textContent = 'Invalid code. Use 123456';
    }
};

window.submitNewPassword = async () => {
    const newPassword = document.getElementById('newPassword').value;
    try {
        await updatePassword(auth.currentUser, newPassword);
        await updateDoc(doc(db, "Guest", auth.currentUser.uid), {
            password: newPassword
        });
        passwordModal.style.display = 'none';
        alert('Password updated successfully');
    } catch (error) {
        alert('Password update failed: ' + error.message);
    }
};

// Profile editing functions
window.toggleEdit = function() {
    document.getElementById('personalDetails').style.display = 'none';
    document.getElementById('editForm').style.display = 'block';
    const user = auth.currentUser;
    getDoc(doc(db, "Guest", user.uid)).then(doc => {
        const data = doc.data();
        document.getElementById('editFName').value = data.fName;
        document.getElementById('editSName').value = data.sName;
        document.getElementById('editPhone').value = data.phoneNum || '';
    });
};

window.cancelEdit = () => {
    document.getElementById('personalDetails').style.display = 'block';
    document.getElementById('editForm').style.display = 'none';
};

window.saveChanges = async () => {
    const user = auth.currentUser;
    const updates = {
        fName: document.getElementById('editFName').value.trim(),
        sName: document.getElementById('editSName').value.trim(),
        phoneNum: document.getElementById('editPhone').value.trim()
    };

    try {
        await updateDoc(doc(db, "Guest", user.uid), updates);
        location.reload();
    } catch (error) {
        console.error("Update failed:", error);
        alert(`Update failed: ${error.message}`);
    }
};

// Booking cancellation
window.cancelBooking = async (bookingId) => {
    if (confirm('Are you sure you want to cancel this booking?')) {
        try {
            await deleteDoc(doc(db, "Booking", bookingId));
            alert('Booking cancelled successfully');
            location.reload();
        } catch (error) {
            console.error("Cancellation failed:", error);
            alert('Failed to cancel booking');
        }
    }
};