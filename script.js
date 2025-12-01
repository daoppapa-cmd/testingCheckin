// 1. នាំចូល Firebase modules
// script.js (ផ្នែកខាងលើ)
import { studentData } from "./name.js"; // <--- បន្ថែមថ្មី
// ... (imports ពី Firebase ដទៃទៀតទុកនៅដដែល) ...
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
// ✅ ត្រូវ៖
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged // <--- ត្រូវមានពាក្យនេះ
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  setLogLevel,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
  getDatabase,
  ref,
  get,
  child,
  onValue
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// 2. Global Variables
let dbAttendance, dbLeave, dbEmployeeList, dbShift, authAttendance;
let allEmployees = [];
let currentMonthRecords = [];
let attendanceRecords = [];
let leaveRecords = [];
let currentUser = null;
let currentUserShift = null;
let attendanceCollectionRef = null;
let attendanceListener = null;
let leaveCollectionListener = null;
let outCollectionListener = null;
let currentConfirmCallback = null;

let sessionCollectionRef = null;
let sessionListener = null;
let currentDeviceId = null;
let modelsLoaded = false;
let currentUserFaceMatcher = null;
let currentScanAction = null;
let videoStream = null;
let isScanning = false; // Flag សម្រាប់គ្រប់គ្រងការ Loop ស្កេន
const FACE_MATCH_THRESHOLD = 0.45;
// ជំនួស let shiftSettings = {}; ដោយកូដខាងក្រោម៖

const shiftSettings = {
  "ពេញម៉ោង": {
    startCheckIn: "07:00 AM",
    endCheckIn: "10:15 AM",
    startCheckOut: "04:30 PM",
    endCheckOut: "11:50 PM"
  },
  "ពេលយប់": {
    startCheckIn: "05:00 PM",
    endCheckIn: "07:50 PM",
    startCheckOut: "08:55 PM",
    endCheckOut: "11:50 PM"
  },
  "មួយព្រឹក": {
    startCheckIn: "07:00 AM",
    endCheckIn: "10:15 AM",
    startCheckOut: "11:30 AM",
    endCheckOut: "11:50 PM"
  },
  "មួយរសៀល": {
    startCheckIn: "12:00 PM",
    endCheckIn: "02:30 PM",
    startCheckOut: "05:30 PM",
    endCheckOut: "11:50 PM"
  }
};

const durationMap = {
  មួយថ្ងៃកន្លះ: 1.5, ពីរថ្ងៃ: 2, ពីរថ្ងៃកន្លះ: 2.5, បីថ្ងៃ: 3, បីថ្ងៃកន្លះ: 3.5,
  បួនថ្ងៃ: 4, បួនថ្ងៃកន្លះ: 4.5, ប្រាំថ្ងៃ: 5, ប្រាំថ្ងៃកន្លះ: 5.5,
  ប្រាំមួយថ្ងៃ: 6, ប្រាំមួយថ្ងៃកន្លះ: 6.5, ប្រាំពីរថ្ងៃ: 7,
};

// 3. Firebase Configurations
const firebaseConfigAttendance = {
  apiKey: "AIzaSyCgc3fq9mDHMCjTRRHD3BPBL31JkKZgXFc",
  authDomain: "checkme-10e18.firebaseapp.com",
  databaseURL: "https://checkme-10e18-default-rtdb.firebaseio.com",
  projectId: "checkme-10e18",
  storageBucket: "checkme-10e18.firebasestorage.app",
  messagingSenderId: "1030447497157",
  appId: "1:1030447497157:web:9792086df1e864559fd5ac",
  measurementId: "G-QCJ2JH4WH6",
};
const firebaseConfigLeave = {
  apiKey: "AIzaSyDjr_Ha2RxOWEumjEeSdluIW3JmyM76mVk",
  authDomain: "dipermisstion.firebaseapp.com",
  projectId: "dipermisstion",
  storageBucket: "dipermisstion.firebasestorage.app",
  messagingSenderId: "512999406057",
  appId: "1:512999406057:web:953a281ab9dde7a9a0f378",
  measurementId: "G-KDPHXZ7H4B",
};
const firebaseConfigEmployeeList = {
  apiKey: "AIzaSyAc2g-t9A7du3K_nI2fJnw_OGxhmLfpP6s",
  authDomain: "dilistname.firebaseapp.com",
  databaseURL: "https://dilistname-default-rtdb.firebaseio.com",
  projectId: "dilistname",
  storageBucket: "dilistname.firebasestorage.app",
  messagingSenderId: "897983357871",
  appId: "1:897983357871:web:42a046bc9fb3e0543dc55a",
  measurementId: "G-NQ798D9J6K"
};

const allowedAreaCoords = [
  [11.415206789703271, 104.7642005060435],
  [11.41524294053174, 104.76409925265823],
  [11.413750665249953, 104.7633762203053],
  [11.41370399757057, 104.7634714387206],
];

// 4. DOM Elements
const loadingView = document.getElementById("loadingView");
const loadingText = document.getElementById("loadingText");
const employeeListView = document.getElementById("employeeListView");
const homeView = document.getElementById("homeView");
const historyView = document.getElementById("historyView");
const footerNav = document.getElementById("footerNav");
const navHomeButton = document.getElementById("navHomeButton");
const navHistoryButton = document.getElementById("navHistoryButton");
const searchInput = document.getElementById("searchInput");
const employeeListContainer = document.getElementById("employeeListContainer");
const welcomeMessage = document.getElementById("welcomeMessage");
const logoutButton = document.getElementById("logoutButton");
const exitAppButton = document.getElementById("exitAppButton");
const profileImage = document.getElementById("profileImage");
const profileName = document.getElementById("profileName");
const profileId = document.getElementById("profileId");
const profileDepartment = document.getElementById("profileDepartment");
const profileGroup = document.getElementById("profileGroup");
const profileShift = document.getElementById("profileShift");

const actionButtonContainer = document.getElementById("actionButtonContainer");
const actionBtnBg = document.getElementById("actionBtnBg");
const actionBtnTitle = document.getElementById("actionBtnTitle");
const actionBtnSubtitle = document.getElementById("actionBtnSubtitle");
const actionBtnIcon = document.getElementById("actionBtnIcon");
const statusMessageContainer = document.getElementById("statusMessageContainer");
const statusTitle = document.getElementById("statusTitle");
const statusDesc = document.getElementById("statusDesc");
const statusIcon = document.getElementById("statusIcon");
const statusIconBg = document.getElementById("statusIconBg");
const noShiftContainer = document.getElementById("noShiftContainer");
const todayActivitySection = document.getElementById("todayActivitySection");
const dateBadge = document.getElementById("dateBadge");
const shiftStatusIndicator = document.getElementById("shiftStatusIndicator");

const historyContainer = document.getElementById("historyContainer");
const monthlyHistoryContainer = document.getElementById("monthlyHistoryContainer");
const customModal = document.getElementById("customModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalCancelButton = document.getElementById("modalCancelButton");
const modalConfirmButton = document.getElementById("modalConfirmButton");
const modalIcon = document.getElementById("modalIcon");
const cameraModal = document.getElementById("cameraModal");
const videoElement = document.getElementById("videoElement");
const cameraCanvas = document.getElementById("cameraCanvas");
const cameraCloseButton = document.getElementById("cameraCloseButton");
const cameraLoadingText = document.getElementById("cameraLoadingText");
const cameraHelpText = document.getElementById("cameraHelpText");
const captureButton = document.getElementById("captureButton");
const employeeListHeader = document.getElementById("employeeListHeader");
const employeeListContent = document.getElementById("employeeListContent");

// 5. Helper Functions & UI Logic
function changeView(viewId) {
  [loadingView, employeeListView, homeView, historyView].forEach(v => {
      if (v) v.style.display = "none";
  });
  const view = document.getElementById(viewId);
  if (view) view.style.display = "flex";
  if (viewId === "homeView" || viewId === "historyView") {
    footerNav.style.display = "block";
  } else {
    footerNav.style.display = "none";
  }
}

function showMessage(title, message, isError = false) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  if (isError) {
      if(modalIcon) {
        modalIcon.innerHTML = '<i class="ph-duotone ph-warning-circle text-3xl text-red-500"></i>';
        modalIcon.className = "w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4";
      }
  } else {
      if(modalIcon) {
        modalIcon.innerHTML = '<i class="ph-duotone ph-info text-3xl text-blue-600"></i>';
        modalIcon.className = "w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4";
      }
  }
  modalConfirmButton.onclick = () => hideMessage();
  modalCancelButton.style.display = "none";
  customModal.classList.remove("modal-hidden");
  customModal.classList.add("modal-visible");
}

function showConfirmation(title, message, confirmText, onConfirm) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  if(modalIcon) {
    modalIcon.innerHTML = '<i class="ph-duotone ph-question text-3xl text-orange-500"></i>';
    modalIcon.className = "w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4";
  }
  modalConfirmButton.textContent = confirmText;
  modalCancelButton.style.display = "block"; 
  modalConfirmButton.onclick = onConfirm;
  modalCancelButton.onclick = hideMessage; 
  
  customModal.classList.remove("modal-hidden");
  customModal.classList.add("modal-visible");
}

function hideMessage() {
  customModal.classList.add("modal-hidden");
  customModal.classList.remove("modal-visible");
}

function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const monthString = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const lastDayString = String(lastDay).padStart(2, "0");
  return { startOfMonth: `${year}-${monthString}-01`, endOfMonth: `${year}-${monthString}-${lastDayString}` };
}

function formatDate(date) {
  try {
    const day = String(date.getDate()).padStart(2, "0");
    const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) { return ""; }
}

function parseTimeStringToDecimal(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const cleanStr = timeStr.replace(/[^a-zA-Z0-9:]/g, ''); 
  const match = cleanStr.match(/(\d+):(\d+)(AM|PM)/i);
  if (!match) return null;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hours !== 12) hours += 12;
  else if (ampm === "AM" && hours === 12) hours = 0;
  return hours + (minutes / 60);
}

function getCaseInsensitiveProp(obj, propName) {
    if (!obj) return undefined;
    const lowerProp = propName.toLowerCase().trim();
    for (const key of Object.keys(obj)) {
        if (key.toLowerCase().trim() === lowerProp) return obj[key];
    }
    return undefined;
}

function checkShiftTime(shiftType, checkType) {
  // 1. ករណីគ្មានវេន
  if (!shiftType || shiftType === "N/A" || shiftType === "None") return false;

  // 2. ករណី Uptime (អនុញ្ញាតគ្រប់ពេល)
  // ចំណាំ៖ function updateButtonState នឹងការពារមិនឱ្យស្កេនស្ទួនដោយខ្លួនឯង
  if (shiftType === "Uptime") return true;

  // 3. ករណីវេនធម្មតា (ពេញម៉ោង, យប់, ព្រឹក, រសៀល)
  const settings = shiftSettings[shiftType];
  if (!settings) return false; // បើឈ្មោះវេនខុសពីអ្វីដែលកំណត់

  let startStr, endStr;
  
  // ចាប់យកម៉ោងចូល ឬ ម៉ោងចេញ
  if (checkType === "checkIn") {
    startStr = settings.startCheckIn;
    endStr = settings.endCheckIn;
  } else {
    startStr = settings.startCheckOut;
    endStr = settings.endCheckOut;
  }

  if (!startStr || !endStr) return false;

  // បំលែងម៉ោងទៅជាលេខ ដើម្បីផ្ទៀងផ្ទាត់ (ឧ. 7:30 -> 7.5)
  const minTime = parseTimeStringToDecimal(startStr);
  const maxTime = parseTimeStringToDecimal(endStr);
  
  if (minTime === null || maxTime === null) return false;

  const now = new Date();
  const currentTime = now.getHours() + now.getMinutes() / 60;

  // ផ្ទៀងផ្ទាត់ម៉ោង
  if (minTime > maxTime) {
    // ករណីឆ្លងចូលថ្ងៃថ្មី (ឧ. ម៉ោង ១១ យប់ ដល់ ២ ភ្លឺ)
    return currentTime >= minTime || currentTime <= maxTime;
  } else {
    // ករណីក្នុងថ្ងៃតែមួយ (ឧ. ៧ ព្រឹក ដល់ ១០ ព្រឹក)
    return currentTime >= minTime && currentTime <= maxTime;
  }
}

function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("កម្មវិធីមិនគាំទ្រការប្រើប្រាស់ទីតាំងលើឧបករណ៍នេះទេ"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p.coords),
      (error) => {
          let msg = "សូមបើក Location";
          switch(error.code) {
              case error.PERMISSION_DENIED:
                  msg = "អ្នកបានបិទការប្រើប្រាស់ទីតាំង (Location Denied)។ សូមចូលទៅកាន់ Setting > Site Settings > Allow Location។";
                  break;
              case error.POSITION_UNAVAILABLE:
                  msg = "មិនអាចស្វែងរកទីតាំងបានទេ។ សូមពិនិត្យ GPS។";
                  break;
              case error.TIMEOUT:
                  msg = "ការស្វែងរកទីតាំងចំណាយពេលយូរពេក។";
                  break;
          }
          reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

function isInsideArea(lat, lon) {
  const polygon = allowedAreaCoords;
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const viy = polygon[i][0], vix = polygon[i][1];
    const vjy = polygon[j][0], vjx = polygon[j][1];
    if ((viy > lat) !== (vjy > lat) && lon < ((vjx - vix) * (lat - viy)) / (vjy - viy) + vix) {
      isInside = !isInside;
    }
  }
  return isInside;
}

// 6. Data Processing
function mergeAttendanceAndLeave(attendanceRecords, leaveRecords) {
  const mergedMap = new Map();
  attendanceRecords.forEach(r => mergedMap.set(r.date, { ...r }));
  return Array.from(mergedMap.values());
}

async function mergeAndRenderHistory() {
  currentMonthRecords = mergeAttendanceAndLeave(attendanceRecords, leaveRecords);
  const todayString = getTodayDateString();
  
  currentMonthRecords.sort((a, b) => {
    if (a.date === todayString) return -1;
    if (b.date === todayString) return 1;
    return b.date.localeCompare(a.date);
  });

  renderTodayHistory();
  renderMonthlyHistory();
  updateButtonState(); 
}

// 7. Rendering Functions
function renderTodayHistory() {
  const container = document.getElementById("historyContainer");
  if (!container) return;
  
  // សម្អាតទិន្នន័យចាស់
  container.innerHTML = "";

  const todayString = getTodayDateString();
  const todayRecord = currentMonthRecords.find(
    (record) => record.date === todayString
  );

  // បង្កើត Element ថ្មី
  const card = document.createElement("div");
  
  // ប្រើ animate-slide-up ដើម្បីឱ្យវាលោតឡើងមកដោយរលូន
  card.className = "animate-slide-up bg-white/80 backdrop-blur-md p-5 rounded-[1.8rem] border border-blue-50 shadow-sm card-hover-effect";

  if (!todayRecord) {
    // ករណីមិនទាន់មានទិន្នន័យ (ដាក់ឱ្យស្អាតជាងមុន)
    card.innerHTML = `
      <div class="flex flex-col items-center justify-center py-6 text-slate-300">
        <i class="ph-duotone ph-clipboard-text text-4xl mb-2 opacity-50"></i>
        <p class="text-xs font-medium">មិនទាន់មានទិន្នន័យថ្ងៃនេះ</p>
      </div>
    `;
  } else {
    // ករណីមានទិន្នន័យ
    const checkIn = todayRecord.checkIn || "--:--";
    const checkOut = todayRecord.checkOut || "មិនទាន់ចេញ";
    
    // ពណ៌សម្រាប់ម៉ោង
    const ciColor = todayRecord.checkIn ? "text-green-600 bg-green-50" : "text-slate-400 bg-slate-50";
    const coColor = todayRecord.checkOut ? "text-red-500 bg-red-50" : "text-slate-400 bg-slate-50";

    card.innerHTML = `
       <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-lg bg-blue-100/80 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
              Today
            </span>
            <span class="text-xs text-slate-400 font-medium">${todayRecord.formattedDate}</span>
          </div>
       </div>
       
       <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col items-center p-3 rounded-2xl ${ciColor} transition-all">
             <span class="text-[10px] opacity-70 mb-1">ចូល</span>
             <span class="text-lg font-bold tracking-tight">${checkIn}</span>
          </div>
          
          <div class="flex flex-col items-center p-3 rounded-2xl ${coColor} transition-all">
             <span class="text-[10px] opacity-70 mb-1">ចេញ</span>
             <span class="text-sm font-bold tracking-tight mt-1">${checkOut}</span>
          </div>
       </div>
    `;
  }

  container.appendChild(card);
}
function renderMonthlyHistory() {
  const container = document.getElementById("monthlyHistoryContainer");
  if (!container) return;
  
  container.innerHTML = "";

  if (currentMonthRecords.length === 0) {
    container.innerHTML = `<p class="text-center py-10 text-slate-400">មិនទាន់មានទិន្នន័យ</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  // ប្រើ index (i) ដើម្បីកំណត់ពេល (Delay)
  currentMonthRecords.forEach((record, i) => {
    // ... (កូដពិនិត្យថ្ងៃ និងពណ៌ នៅដដែល) ...
    const checkIn = record.checkIn ? record.checkIn : "---";
    const checkOut = record.checkOut ? record.checkOut : "---";
    const ciClass = record.checkIn ? "text-blue-600" : "text-slate-400";
    const coClass = record.checkOut ? "text-blue-600" : "text-slate-400";
    const isToday = record.date === getTodayDateString();
    const bgClass = isToday ? "bg-blue-50 border-blue-100" : "bg-white border-slate-50";

    const card = document.createElement("div");
    
    // === បន្ថែម Class "list-item-anim" នៅទីនេះ ===
    card.className = `${bgClass} p-4 rounded-2xl shadow-sm border mb-3 list-item-anim`;
    
    // === កំណត់ Delay ឱ្យកាតនីមួយៗលោតមកយឺតជាងគ្នាបន្តិច ===
    card.style.animationDelay = `${i * 0.05}s`; // កាតទី១ 0s, ទី២ 0.05s, ទី៣ 0.1s ...

    card.innerHTML = `
        <div class="flex justify-between items-center mb-3">
           <p class="text-sm font-bold text-slate-800">
             ${record.formattedDate || record.date}
             ${isToday ? '<span class="ml-2 text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full">Today</span>' : ''}
           </p>
        </div>
        <div class="flex flex-col space-y-2 text-sm">
          <div class="flex justify-between border-b border-gray-100 pb-1">
            <span class="text-slate-500">ចូល</span>
            <span class="${ciClass} font-medium">${checkIn}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">ចេញ</span>
            <span class="${coClass} font-medium">${checkOut}</span>
          </div>
        </div>
    `;
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}
function renderEmployeeList(employees) {
  const container = document.getElementById("employeeListContainer");
  if(!container) return;
  
  container.innerHTML = "";
  container.classList.remove("hidden");

  if (employees.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-500 p-3">រកមិនឃើញ។</p>`;
    return;
  }
  
  const fragment = document.createDocumentFragment();

  employees.forEach((emp) => {
    const card = document.createElement("div");
    card.className = "flex items-center p-3 rounded-xl cursor-pointer hover:bg-blue-50 active:bg-blue-100 transition-colors shadow-sm mb-2 bg-white border border-slate-50";
    card.innerHTML = `
              <img src="${emp.photoUrl || "https://placehold.co/48x48/e2e8f0/64748b?text=No+Img"}" 
                  class="w-12 h-12 rounded-full object-cover border-2 border-slate-100 mr-3 bg-slate-200"
                  loading="lazy">
              <div>
                  <h3 class="text-sm font-bold text-slate-800">${emp.name}</h3>
                  <p class="text-xs text-slate-500">ID: ${emp.id}</p>
              </div>
          `;
    card.onmousedown = () => selectUser(emp);
    fragment.appendChild(card);
  });
  
  container.appendChild(fragment);
}

// 8. Listener Setup Functions
// ស្វែងរក function setupAttendanceListener ក្នុង script.js
function setupAttendanceListener() {
  if (!attendanceCollectionRef) return;
  if (attendanceListener) attendanceListener();

  console.log("កំពុងរង់ចាំទិន្នន័យវត្តមាន...");

  attendanceListener = onSnapshot(attendanceCollectionRef, (querySnapshot) => {
    console.log("ទទួលបានទិន្នន័យពី Database!", querySnapshot.size);
    
    let allRecords = [];
    querySnapshot.forEach((doc) => {
        allRecords.push(doc.data());
    });

    // === ចំណុចបន្ថែម ដើម្បី Debug ===
    console.log("ទិន្នន័យទាំងអស់ (Raw Data):", allRecords);
    
    const { startOfMonth, endOfMonth } = getCurrentMonthRange();
    console.log(`កំពុងច្រោះយកចន្លោះពី: ${startOfMonth} ដល់ ${endOfMonth}`);

    attendanceRecords = allRecords.filter(
      (record) => record.date >= startOfMonth && record.date <= endOfMonth
    );
    
    console.log("ទិន្នន័យដែលសល់ក្រោយច្រោះ (Filtered):", attendanceRecords.length);
    // ==============================

    mergeAndRenderHistory();
  }, (error) => {
      console.error("Error fetching attendance:", error);
  });
}
function startLeaveListeners() {
  // ថែមការត្រួតពិនិត្យឱ្យច្បាស់
  if (!dbLeave || !currentUser) {
    console.log("Leave Database not ready or User not selected.");
    return;
  }

  const employeeId = currentUser.id;
  const reFetch = async () => {
    mergeAndRenderHistory();
  };

  try {
    // ❌ កូដចាស់ (មាន / នៅពីមុខ): "/artifacts/..."
    // ✅ កូដថ្មី (លុប / ចេញ): "artifacts/..."

    const qLeave = query(
      collection(dbLeave, "artifacts/default-app-id/public/data/leave_requests"), 
      where("userId", "==", employeeId)
    );
    leaveCollectionListener = onSnapshot(qLeave, reFetch);

    const qOut = query(
      collection(dbLeave, "artifacts/default-app-id/public/data/out_requests"),
      where("userId", "==", employeeId)
    );
    outCollectionListener = onSnapshot(qOut, reFetch);
    
  } catch (error) {
    console.error("Error connecting to Leave DB:", error);
  }
}

function startSessionListener(employeeId) {
  if (sessionListener) sessionListener();
  const sessionDocRef = doc(sessionCollectionRef, employeeId);
  sessionListener = onSnapshot(sessionDocRef, (docSnap) => {
    if (!docSnap.exists()) { forceLogout("Session បានបញ្ចប់។"); return; }
    const sessionData = docSnap.data();
    if (localStorage.getItem("currentDeviceId") && sessionData.deviceId !== localStorage.getItem("currentDeviceId")) {
      forceLogout("គណនីកំពុងប្រើនៅកន្លែងផ្សេង។");
    }
  });
}

function listenToShiftSettings() {
  const shiftRef = ref(dbShift, 'វេនធ្វើការ');
  onValue(shiftRef, (snapshot) => {
    if (snapshot.exists()) {
      shiftSettings = snapshot.val();
      if (currentUser) updateButtonState();
    }
  });
}

// 9. Face & Camera Functions (Smooth Loop Implementation)
async function loadAIModels() {
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("./models"),
    ]);
    modelsLoaded = true;
    
    // ❌ កូដចាស់ (លុបចោល)៖
    // fetchEmployeesFromRTDB(); 

    // ✅ កូដថ្មី (ជំនួសវិញ)៖
    loadEmployeesFromLocal(); 

  } catch (e) {
    console.error(e);
  }
}
async function prepareFaceMatcher(imageUrl) {
  currentUserFaceMatcher = null;
  if (!imageUrl || imageUrl.includes("placehold.co")) return;
  try {
    const img = await faceapi.fetchImage(imageUrl, { mode: 'cors' }); 
    const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    if (detection) {
        currentUserFaceMatcher = new faceapi.FaceMatcher(detection.descriptor);
    } else {
        console.warn("No face detected in profile image.");
    }
  } catch (e) { 
      console.error("Error preparing face matcher:", e);
  }
}

async function startFaceScan(action) {
  currentScanAction = action;
  if (!modelsLoaded) { showMessage("Notice", "AI មិនទាន់ដំណើរការ។"); return; }
  
  cameraModal.classList.remove("modal-hidden");
  cameraModal.classList.add("modal-visible");
  
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 } } });
    videoElement.srcObject = videoStream;
    
    // Start scanning loop
    videoElement.onplay = () => {
        isScanning = true;
        scanLoop();
    };
  } catch (err) {
    showMessage("Error", "កាមេរ៉ាមានបញ្ហា");
    hideCameraModal();
  }
}

function stopCamera() {
  isScanning = false; // Stop loop
  if (videoStream) videoStream.getTracks().forEach(t => t.stop());
  videoElement.srcObject = null;
}

function hideCameraModal() {
  stopCamera();
  cameraModal.classList.add("modal-hidden");
  cameraModal.classList.remove("modal-visible");
}

// *** SMOOTH SCANNING LOOP ***
async function scanLoop() {
    if (!isScanning) return;
    
    // Ensure video is playing and ready
    if (videoElement.paused || videoElement.ended || !faceapi.nets.tinyFaceDetector.params) {
        return setTimeout(scanLoop, 100);
    }

    // Resize canvas logic removed to allow smooth video display (Canvas is transparent overlay)
    // Face detection runs on videoElement directly
    const detection = await faceapi.detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

    if (!detection) {
        if(cameraLoadingText) cameraLoadingText.textContent = "កំពុងស្វែងរកមុខ...";
        return setTimeout(scanLoop, 100); // Retry quickly
    }

    if (!currentUserFaceMatcher) {
         if(cameraLoadingText) cameraLoadingText.textContent = "គ្មានរូប Profile!";
         return setTimeout(scanLoop, 500);
    }

    const match = currentUserFaceMatcher.findBestMatch(detection.descriptor);
    
    // Validate match
    if (match.distance <= FACE_MATCH_THRESHOLD) {
        isScanning = false;
        processScanSuccess();
    } else {
        if(cameraLoadingText) cameraLoadingText.textContent = "មិនត្រូវគ្នា (" + Math.round((1 - match.distance) * 100) + "%)";
        setTimeout(scanLoop, 500); // Retry after delay
    }
}

function processScanSuccess() {
    if(cameraLoadingText) cameraLoadingText.innerHTML = '<span class="text-green-400">ជោគជ័យ!</span>';
    setTimeout(() => {
        hideCameraModal();
        if (currentScanAction === "checkIn") handleCheckIn();
        else handleCheckOut();
    }, 800);
}

// 10. Main Action & UI Functions
async function handleCheckIn() {
  if(actionBtnTitle) actionBtnTitle.textContent = "កំពុងដំណើរការ...";
  
  try {
     const coords = await getUserLocation();
     if (!isInsideArea(coords.latitude, coords.longitude)) {
         showMessage("ទីតាំង", "អ្នកនៅក្រៅបរិវេណក្រុមហ៊ុន");
         updateButtonState();
         return;
     }
     
     const now = new Date();
     const todayDocId = getTodayDateString(now);
     
     await setDoc(doc(attendanceCollectionRef, todayDocId), {
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        department: currentUser.department,
        shift: currentUserShift,
        date: todayDocId,
        checkInTimestamp: now.toISOString(),
        formattedDate: formatDate(now),
        checkIn: formatTime(now),
        checkInLocation: { lat: coords.latitude, lon: coords.longitude }
     });
     
     // *** Removed success message as requested ***
     
  } catch (e) {
     showMessage("Error", e.message, true);
     updateButtonState();
  }
}

async function handleCheckOut() {
  if (actionBtnTitle) actionBtnTitle.textContent = "កំពុងដំណើរការ...";

  try {
    const coords = await getUserLocation();
    if (!isInsideArea(coords.latitude, coords.longitude)) {
      showMessage("ទីតាំង", "អ្នកនៅក្រៅបរិវេណក្រុមហ៊ុន");
      updateButtonState();
      return;
    }

    const now = new Date();
    const todayDocId = getTodayDateString(now);
    
    // យើងប្រើ setDoc ជាមួយ { merge: true } ជំនួសឱ្យ updateDoc
    // ដើម្បីការពារករណីដែលគាត់មិនបាន Check In (ឯកសារមិនទាន់មាន)
    await setDoc(doc(attendanceCollectionRef, todayDocId), {
      // បើមិនទាន់មានទិន្នន័យគោល (ករណីភ្លេច Check In) យើងត្រូវបញ្ចូលព័ត៌មានមូលដ្ឋាន
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      department: currentUser.department,
      shift: currentUserShift,
      date: todayDocId,
      formattedDate: formatDate(now),
      
      // ទិន្នន័យ Check Out
      checkOutTimestamp: now.toISOString(),
      checkOut: formatTime(now),
      checkOutLocation: { lat: coords.latitude, lon: coords.longitude },
      
      // ដាក់ចំណាំថា Check In "N/A" បើវាមិនទាន់មាន
      // (Firestore នឹងមិនលុប Check In ចាស់ចោលទេ ដោយសារ merge: true)
    }, { merge: true });

    // updateButtonState នឹងត្រូវហៅដោយស្វ័យប្រវត្តិតាមរយៈ onSnapshot listener
  } catch (e) {
    showMessage("Error", e.message, true);
    updateButtonState();
  }
}

function showActionButton(title, subtitle, icon, gradientClass, action) {
    if(!actionButtonContainer) return;
    actionButtonContainer.classList.remove('hidden');
    actionBtnTitle.textContent = title;
    actionBtnSubtitle.textContent = subtitle;
    actionBtnIcon.className = `ph-fill ${icon} text-2xl`;
    actionBtnBg.className = `absolute inset-0 bg-gradient-to-br ${gradientClass} transition-all duration-500`;
    
    const currentBtn = document.getElementById('mainActionButton');
    if (currentBtn) {
        currentBtn.onclick = () => startFaceScan(action);
        if (!currentBtn.classList.contains('btn-pulse')) {
            currentBtn.classList.add('btn-pulse');
        }
    }
}

function showStatusMessage(title, desc, icon, iconBgClass) {
    if(!statusMessageContainer) return;
    statusMessageContainer.classList.remove('hidden');
    statusTitle.textContent = title;
    statusDesc.textContent = desc;
    statusIcon.className = `ph-duotone ${icon} text-3xl`;
    statusIconBg.className = `w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${iconBgClass}`;
}

async function updateButtonState() {
  const todayString = getTodayDateString();
  const todayData = currentMonthRecords.find((r) => r.date === todayString);
  const shift = currentUserShift;
  const hasShift = shift && shift !== "N/A" && shift !== "None";

  // Reset UI elements
  if (actionButtonContainer) actionButtonContainer.classList.add("hidden");
  if (statusMessageContainer) statusMessageContainer.classList.add("hidden");
  if (noShiftContainer) noShiftContainer.classList.add("hidden");
  if (shiftStatusIndicator) shiftStatusIndicator.classList.add("hidden");

  if (!hasShift) {
    if (noShiftContainer) noShiftContainer.classList.remove("hidden");
    return;
  }

  const canCheckIn = checkShiftTime(shift, "checkIn");
  const canCheckOut = checkShiftTime(shift, "checkOut");

  // ============================================================
  // 1. ពិនិត្យជាមុន៖ តើបាន Check Out រួចហើយឬនៅ?
  // (មិនថាគាត់បាន Check In ឬអត់ទេ ឱ្យតែមានម៉ោងចេញ គឺចប់ភារកិច្ច)
  // ============================================================
  if (todayData && todayData.checkOut) {
    showStatusMessage(
      "កត់ត្រារួចរាល់",
      "អ្នកបាន Check Out រួចរាល់ហើយ",
      "ph-check-circle",
      "bg-green-100 text-green-600"
    );
    return; // បញ្ឈប់ការងារត្រឹមនេះ លែងបង្ហាញប៊ូតុងទៀតហើយ
  }

  // ============================================================
  // 2. ករណីមិនទាន់ Check Out (កំពុងធ្វើការ ឬមិនទាន់ចូល)
  // ============================================================
  
  if (todayData && todayData.checkIn) {
    // --- ករណី A: បាន Check In រួចហើយ (កំពុងធ្វើការ) ---
    if (canCheckOut) {
      showActionButton(
        "Check Out",
        "ចុចដើម្បីចាកចេញ",
        "ph-sign-out",
        "from-red-500 to-orange-600",
        "checkOut"
      );
    } else {
      showStatusMessage(
        "កំពុងបំពេញការងារ",
        "រង់ចាំដល់ម៉ោងចេញពីការងារ",
        "ph-hourglass",
        "bg-blue-100 text-blue-600"
      );
      const iconEl = document.getElementById("statusIcon");
      if(iconEl) iconEl.classList.add("animate-breathe");
    }
  } else {
    // --- ករណី B: មិនទាន់ Check In (ឬភ្លេច Check In) ---
    if (canCheckIn) {
      // ដល់ម៉ោងចូល -> បង្ហាញ Check In
      showActionButton(
        "Check In",
        "ចុចដើម្បីចូលធ្វើការ",
        "ph-sign-in",
        "from-blue-600 to-cyan-500",
        "checkIn"
      );
    } else if (canCheckOut) {
      // ដល់ម៉ោងចេញ (តែអត់មាន Check In) -> បង្ហាញ Check Out ឱ្យគាត់បំពេញ
      showActionButton(
        "Check Out",
        "អ្នកមិនបាន Check In (ចុចដើម្បីចេញ)",
        "ph-sign-out",
        "from-red-500 to-orange-600",
        "checkOut"
      );
    } else {
      // ក្រៅម៉ោងទាំងពីរ
      showStatusMessage(
        "ក្រៅម៉ោង Check-in",
        "សូមរង់ចាំដល់ម៉ោងកំណត់",
        "ph-clock-slash",
        "bg-slate-100 text-slate-400"
      );
    }
  }
}

function formatTime(date) {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

// 11. User Selection & Init
async function selectUser(employee) {
  changeView("homeView");
  
  currentUser = employee;
  localStorage.setItem("savedEmployeeId", employee.id);
  
  welcomeMessage.textContent = `សូមស្វាគមន៍`;
  profileImage.src = employee.photoUrl || "https://placehold.co/80x80/e2e8f0/64748b?text=No+Img";
  profileName.textContent = employee.name;
  profileId.textContent = `ID: ${employee.id}`;
  
  if(profileDepartment) profileDepartment.textContent = employee.department || "N/A"; 
  if(profileGroup) profileGroup.textContent = employee.group || "N/A";
  
  const dayOfWeek = new Date().getDay();
  const dayToShiftKey = ["shiftSun", "shiftMon", "shiftTue", "shiftWed", "shiftThu", "shiftFri", "shiftSat"];
  currentUserShift = currentUser[dayToShiftKey[dayOfWeek]] || "N/A";
  if(profileShift) profileShift.textContent = currentUserShift;
  
  const firestoreUserId = currentUser.id;
  const simpleDataPath = `attendance/${firestoreUserId}/records`;
  attendanceCollectionRef = collection(dbAttendance, simpleDataPath);
  
  currentDeviceId = self.crypto.randomUUID();
  localStorage.setItem("currentDeviceId", currentDeviceId);
  
  setDoc(doc(sessionCollectionRef, employee.id), {
      deviceId: currentDeviceId,
      timestamp: new Date().toISOString(),
      employeeName: employee.name,
  }).catch(console.error);

  setupAttendanceListener();
  startLeaveListeners();
  startSessionListener(employee.id);
  prepareFaceMatcher(employee.photoUrl);
  
  if(employeeListContainer) employeeListContainer.classList.add("hidden");
  if(searchInput) searchInput.value = "";
}

function logout() {
  currentUser = null;
  localStorage.removeItem("savedEmployeeId");
  if (attendanceListener) attendanceListener();
  if (sessionListener) sessionListener();
  if (leaveCollectionListener) leaveCollectionListener();
  if (outCollectionListener) outCollectionListener();

  attendanceRecords = [];
  leaveRecords = [];
  currentMonthRecords = [];
  
  if(historyContainer) historyContainer.innerHTML = "";
  if(monthlyHistoryContainer) monthlyHistoryContainer.innerHTML = "";
  
  changeView("employeeListView");
}

function forceLogout(message) {
  logout();
  showMessage("Log Out", message, true);
}

function checkAutoLogin() {
    const savedId = localStorage.getItem("savedEmployeeId");
    if (savedId) {
        const savedEmp = allEmployees.find(e => e.id === savedId);
        if (savedEmp) selectUser(savedEmp);
        else changeView("employeeListView");
    } else {
        changeView("employeeListView");
    }
}


// ជំនួស function fetchFromNetwork និង fetchEmployeesFromRTDB ដោយកូដនេះ៖

function loadEmployeesFromLocal() {
  // បិទ Loading View
  changeView("loadingView");
  
  try {
    // យកទិន្នន័យពី name.js មកប្រើផ្ទាល់
    allEmployees = Object.keys(studentData).map((key) => {
      const student = studentData[key];
      const schedule = student["កាលវិភាគ"] || {};

      return {
        id: String(key).trim(),
        name: student["ឈ្មោះ"] || "N.A",
        department: student["ផ្នែកការងារ"] || "N/A",
        photoUrl: student["រូបថត"] || null,
        group: student["ក្រុម"] || "N/A",
        gender: student["ភេទ"] || "N/A",
        grade: student["ថ្នាក់"] || "N/A",
        
        // Mapping ថ្ងៃតាមអក្ខរាវិរុទ្ធក្នុង name.js របស់អ្នក
        shiftMon: schedule["ចន្ទ"] || null, 
        shiftTue: schedule["អង្គារ៍"] || schedule["អង្គារ"] || null,
        shiftWed: schedule["ពុធ"] || null,
        shiftThu: schedule["ព្រហស្បត្តិ៍"] || schedule["ព្រហស្បតិ៍"] || null,
        shiftFri: schedule["សុក្រ"] || null,
        shiftSat: schedule["សៅរ៍"] || null,
        shiftSun: schedule["អាទិត្យ"] || null,
      };
    }).filter(
      (emp) => emp.group !== "ការងារក្រៅ" && emp.group !== "បុគ្គលិក"
    );

    // បង្ហាញទិន្នន័យ
    renderEmployeeList(allEmployees);
    
    // ពិនិត្យមើលថាធ្លាប់ Login ឬនៅ
    checkAutoLogin();

  } catch (err) {
    console.error("Error loading local data:", err);
    changeView("employeeListView");
  }
}

// ❌ កុំសរសេរ៖ authAttendance.onAuthStateChanged(...)

// ✅ ត្រូវសរសេរ៖
function setupAuthListener() {
  // ❌ ខុស៖ authAttendance.onAuthStateChanged(...) 
  
  // ✅ ត្រូវ៖ ដាក់ authAttendance ក្នុងវង់ក្រចកវិញ
  onAuthStateChanged(authAttendance, (user) => {
    if (user) {
      loadAIModels();
    } else {
      signInAnonymously(authAttendance).catch((error) => {
        showMessage("បញ្ហា", `Login Error: ${error.message}`, true);
      });
    }
  });
}
async function initializeAppFirebase() {
  try {
    const attendanceApp = initializeApp(firebaseConfigAttendance);
    dbAttendance = getFirestore(attendanceApp);
    
    // ❌ ខុស៖ const authAttendance = ... (កុំដាក់ const/let)
    // ✅ ត្រូវ៖
    authAttendance = getAuth(attendanceApp); 

    dbShift = getDatabase(attendanceApp);
    sessionCollectionRef = collection(dbAttendance, "active_sessions");

    const leaveApp = initializeApp(firebaseConfigLeave, "leaveApp");
    dbLeave = getFirestore(leaveApp);

    setLogLevel("silent");

    // ហៅមុខងារបន្ទាប់ពីកំណត់ authAttendance រួចរាល់
    setupAuthListener(); 
    
    // listenToShiftSettings(); // បិទចោលព្រោះយើងសរសេរកូដម៉ោងក្នុងនេះហើយ
    loadEmployeesFromLocal();

  } catch (error) {
    showMessage("Error", error.message, true);
  }
}

// 12. DOM Event Listeners
if(searchInput) {
    searchInput.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allEmployees.filter(e => e.name.toLowerCase().includes(term) || e.id.includes(term));
        renderEmployeeList(filtered);
    });
    searchInput.addEventListener("focus", () => {
        if(employeeListHeader) employeeListHeader.style.display = "none";
        if(employeeListContent) employeeListContent.style.paddingTop = "1rem";
        renderEmployeeList(allEmployees);
    });
    searchInput.addEventListener("blur", () => {
        setTimeout(() => {
            if(employeeListHeader) employeeListHeader.style.display = "flex";
            if(employeeListContent) employeeListContent.style.paddingTop = "";
            if(employeeListContainer) employeeListContainer.classList.add("hidden");
        }, 200);
    });
}

if(logoutButton) logoutButton.addEventListener("click", () => showConfirmation("Log Out", "ចាកចេញមែនទេ?", "Yes", () => { logout(); hideMessage(); }));
if(exitAppButton) exitAppButton.addEventListener("click", () => showConfirmation("Exit", "បិទកម្មវិធី?", "Yes", () => { window.close(); hideMessage(); }));
if(cameraCloseButton) cameraCloseButton.addEventListener("click", hideCameraModal);
if(navHomeButton) navHomeButton.addEventListener("click", () => { changeView("homeView"); navHomeButton.classList.add("active-nav"); navHistoryButton.classList.remove("active-nav"); });
if(navHistoryButton) navHistoryButton.addEventListener("click", () => { changeView("historyView"); navHistoryButton.classList.add("active-nav"); navHomeButton.classList.remove("active-nav"); });
if(modalCancelButton) modalCancelButton.addEventListener("click", hideMessage);

document.addEventListener("DOMContentLoaded", initializeAppFirebase);
