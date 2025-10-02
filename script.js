// ------------------- Firebase Config -------------------
const firebaseConfig = { 
  apiKey: "AIzaSyA6naFHSyy3NyoKMzvxMMfBTDq3somZLFo", 
  authDomain: "portfolio-builder-291d9.firebaseapp.com",
  projectId: "portfolio-builder-291d9", 
  storageBucket: "portfolio-builder-291d9.appspot.com",
  messagingSenderId: "90740593047", 
  appId: "1:90740593047:web:13a3844940c71aca8534d2",
  measurementId: "G-RG0MNJMFCF"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// ------------------- DOM Elements -------------------
const authSection = document.getElementById("authSection");
const portfolioForm = document.getElementById("portfolioForm");
const portfolioActions = document.getElementById("portfolioActions");
const preview = document.getElementById("portfolioPreview");
const darkModeToggle = document.getElementById("darkModeToggle");
const fontSelect = document.getElementById("fontSelect");
const welcomeMsg = document.getElementById("welcomeMsg");
const logoutBtn = document.getElementById("logoutBtn");

// ------------------- Auth -------------------
document.getElementById("loginBtn").onclick = () => {
  const email = document.getElementById("authEmail").value;
  const pass = document.getElementById("authPassword").value;
  auth.signInWithEmailAndPassword(email, pass)
    .then(() => showBuilder())
    .catch(e => document.getElementById("authMessage").innerText = e.message);
};

document.getElementById("registerBtn").onclick = () => {
  const email = document.getElementById("authEmail").value;
  const pass = document.getElementById("authPassword").value;
  auth.createUserWithEmailAndPassword(email, pass)
    .then(cred => {
      db.collection("users").doc(cred.user.uid).set({
        email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      showBuilder();
    })
    .catch(e => document.getElementById("authMessage").innerText = e.message);
};

logoutBtn.onclick = () => {
  auth.signOut();
};

auth.onAuthStateChanged(user => {
  if(user){
    showBuilder();
    welcomeMsg.innerText = `Welcome, ${user.email}`;
    logoutBtn.style.display = "inline-block";
  } else {
    authSection.style.display = "block";
    portfolioForm.style.display = "none";
    portfolioActions.style.display = "none";
    welcomeMsg.innerText = "";
    logoutBtn.style.display = "none";
  }
});

// ------------------- Show Builder -------------------
function showBuilder() {
  authSection.style.display = "none";
  portfolioForm.style.display = "block";
  portfolioActions.style.display = "block";
  loadDraft();
}

// ------------------- Dark Mode & Font -------------------
darkModeToggle.addEventListener("change", () => {
  document.body.classList.toggle("dark-mode", darkModeToggle.checked);
});
fontSelect.addEventListener("change", () => {
  document.documentElement.style.setProperty('--fontFamily', fontSelect.value);
});

// ------------------- File Upload -------------------
async function uploadFile(file, path) {
  if(!file) return "";
  const ref = storage.ref(path);
  const snapshot = await ref.put(file);
  return await snapshot.ref.getDownloadURL();
}

// ------------------- Autosave -------------------
function saveDraft(){
  const formData = {};
  portfolioForm.querySelectorAll("input,textarea,select").forEach(el=>{
    if(el.type=="checkbox") formData[el.id]=el.checked;
    else formData[el.id]=el.value;
  });
  localStorage.setItem("portfolioDraft", JSON.stringify(formData));
}
setInterval(saveDraft,5000);

function loadDraft(){
  const saved = JSON.parse(localStorage.getItem("portfolioDraft"));
  if(saved){
    Object.keys(saved).forEach(key => {
      const el=document.getElementById(key);
      if(el){ 
        // Skip file input elements to prevent "InvalidStateError"
        if (el.type === 'file') {
            return;
        }
        if(el.type=="checkbox") el.checked=saved[key]; 
        else el.value=saved[key]; 
      }
    });
  }
}

// ------------------- Portfolio Builder -------------------
let currentData = {};

portfolioForm.addEventListener("submit", async e=>{
  e.preventDefault();
  const user = auth.currentUser;
  if(!user){ alert("Please login first!"); return; }

  currentData = {
    uid: user.uid,
    name: document.getElementById("name").value,
    about: document.getElementById("about").value,
    skills: document.getElementById("skills").value.split(","),
    projects: document.getElementById("projects").value.split(";"),
    education: document.getElementById("education").value,
    experience: document.getElementById("experience").value,
    certifications: document.getElementById("certifications").value,
    testimonials: document.getElementById("testimonials").value,
    hobbies: document.getElementById("hobbies").value,
    languages: document.getElementById("languages").value,
    achievements: document.getElementById("achievements").value,
    references: document.getElementById("references").value,
    email: document.getElementById("email").value,
    socialLinks: document.getElementById("socialLinks").value,
    template: document.getElementById("template").value,
    themeColor: document.getElementById("themeColor").value,
    font: fontSelect.value,
    darkMode: darkModeToggle.checked,
    profilePic:"",
    video:""
  };

  const profileFile = document.getElementById("profilePic").files[0];
  if(profileFile) currentData.profilePic = await uploadFile(profileFile, `profiles/${user.uid}_${profileFile.name}`);
  currentData.video = document.getElementById("mediaUrl").value || "";

  generatePortfolio(currentData);

  const docRef = await db.collection("portfolios").add({...currentData, html: preview.innerHTML, views:0, timestamp: firebase.firestore.FieldValue.serverTimestamp()});
  alert(`Portfolio saved! Shareable link: view.html?id=${docRef.id}`);
});

// ------------------- Generate Portfolio HTML -------------------
function generatePortfolio(data){
  const skillsHTML = data.skills.map(s=>{
    let [name,value] = s.split("-");
    return `<li>${name.trim()} <span>${value?value.trim():0}%</span>
      <div class="skill-bar"><div class="skill-bar-inner" style="width:${value?value.trim():0}%"></div></div></li>`;
  }).join("");

  const projectHTML = data.projects.map(p=>{
    let [title,desc,img] = p.split("-");
    let imgHTML = img?`<img src="${img.trim()}" class="project-img" style="max-width:200px;cursor:pointer;">`:"";
    return `<div class="project"><h3>${title.trim()}</h3><p>${desc?desc.trim():""}</p>${imgHTML}</div>`;
  }).join("");

  const sectionHTML = (content,cls) => `<div class="${cls}">${content.split(";").map(i=>`<li>${i.trim()}</li>`).join("")}</div>`;
  const socialHTML = data.socialLinks ? `<div class="social-links">${data.socialLinks.split(",").map(l=>`<a href="${l.trim()}" target="_blank">${l.trim()}</a>`).join("")}</div>`:"";
  const picHTML = data.profilePic ? `<img src="${data.profilePic}" class="profile-pic">` : "";
  const videoHTML = data.video ? `<div class="video-intro"><iframe src="${data.video}" frameborder="0" allowfullscreen></iframe></div>` : "";

  preview.innerHTML = `<div class="portfolio-container ${data.template}" style="--themeColor:${data.themeColor};font-family:${data.font}">
    ${picHTML}
    <h2>${data.name}</h2>
    <p><strong>About Me:</strong> ${data.about}</p>
    <h3>Skills</h3><ul class="skills">${skillsHTML}</ul>
    <h3>Projects</h3><div class="carousel">${projectHTML}</div>
    ${videoHTML}
    <h4>Education</h4>${sectionHTML(data.education,"education")}
    <h4>Experience</h4>${sectionHTML(data.experience,"experience")}
    <h4>Certifications</h4>${sectionHTML(data.certifications,"certifications")}
    <h4>Testimonials</h4>${sectionHTML(data.testimonials,"testimonials")}
    <h4>Hobbies</h4>${sectionHTML(data.hobbies,"hobbies")}
    <h4>Languages</h4>${sectionHTML(data.languages,"languages")}
    <h4>Achievements</h4>${sectionHTML(data.achievements,"achievements")}
    <h4>References</h4>${sectionHTML(data.references,"references")}
    <h3>Contact</h3><p>Email: ${data.email}</p>
    ${socialHTML}
  </div>`;

  animateSkillBars();
  activateLightbox();
}

// ------------------- Skill Bars -------------------
function animateSkillBars(){ 
  document.querySelectorAll('.skill-bar-inner').forEach(el=>{
    const w=el.style.width;
    el.style.width="0%";
    setTimeout(()=>el.style.width=w,100);
  }); 
}

// ------------------- Lightbox -------------------
const modal=document.createElement("div");
modal.className="modal";
modal.innerHTML=`<span class="modal-close">&times;</span><img class="modal-content">`;
document.body.appendChild(modal);
const modalImg=modal.querySelector(".modal-content");
const modalClose=modal.querySelector(".modal-close");
function activateLightbox(){document.querySelectorAll(".project-img").forEach(img=>{img.addEventListener("click",()=>openLightbox(img.src));});}
function openLightbox(src){modal.style.display="block";modalImg.src=src;}
modalClose.onclick=()=>{modal.style.display="none";}
modal.onclick=e=>{if(e.target===modal) modal.style.display="none";}

// ------------------- PDF & HTML Export -------------------
document.getElementById("downloadPDF").addEventListener("click",()=>{
  if(!preview.innerHTML){alert("Generate portfolio first!");return;}
  html2pdf().set({margin:0.5,filename:'MyPortfolio.pdf',image:{type:'jpeg',quality:0.98},html2canvas:{scale:2},jsPDF:{unit:'in',format:'letter',orientation:'portrait'}}).from(preview).save();
});
document.getElementById("exportHTML").addEventListener("click",()=>{
  if(!preview.innerHTML){alert("Generate portfolio first!");return;}
  const htmlContent=`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${currentData.name}'s Portfolio</title><link rel="stylesheet" href="style.css"></head><body>${preview.innerHTML}</body></html>`;
  const blob=new Blob([htmlContent],{type:"text/html"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="MyPortfolio.html";
  a.click();
  URL.revokeObjectURL(url);
});