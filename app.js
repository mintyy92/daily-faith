// Daily Faith — daily content is selected by the visitor's local calendar date.
// Bible quotations are from the World English Bible (WEB).
const dailyContent = [
  {ref:"Joshua 1:9",text:"Haven't I commanded you? Be strong and courageous. Don't be afraid. Don't be discouraged, for Yahweh your God is with you wherever you go.",context:"Courage for the road ahead",title:"You are not alone",reflection:"Courage does not mean that fear never appears. It means choosing to keep going while trusting that God is with you. Whatever is in front of you today, take the next step with faith rather than letting worry decide your direction.",prayer:"Heavenly Father, give me courage for the things I face today. When I feel uncertain, remind me that I do not walk alone. Help me move forward with wisdom, patience and faith. Amen."},
  {ref:"Psalm 46:10",text:"Be still, and know that I am God.",context:"Peace in the middle of the noise",title:"Make room for stillness",reflection:"Life can become crowded with noise, pressure and endless things to do. This verse invites you to pause. You do not have to solve everything in this moment. Make space for quiet, remember who God is, and let that truth steady your heart.",prayer:"God, quiet the noise around me and within me. Help me slow down, listen and trust You. Bring peace to the parts of my life that feel unsettled. Amen."},
  {ref:"Proverbs 3:5",text:"Trust in Yahweh with all your heart, and don't lean on your own understanding.",context:"Trust when the path is unclear",title:"Trust the journey",reflection:"You will not always have every answer or see how everything will work out. Faith asks you to trust beyond what you can understand right now. Do what is wise in front of you, and leave room for God to guide the rest.",prayer:"Lord, help me trust You when I cannot see the whole picture. Guide my decisions, shape my thoughts and help me release the need to control everything. Amen."},
  {ref:"Philippians 4:13",text:"I can do all things through Christ, who strengthens me.",context:"Strength for what matters",title:"Strength for today",reflection:"This is not a promise that every task will be easy. It is a reminder that Christ can strengthen you to meet each season with endurance, humility and hope. You can face today's challenges one step at a time.",prayer:"Jesus, be my strength today. Give me patience when things are difficult, courage when I feel weak and a steady heart through every challenge. Amen."},
  {ref:"1 Peter 5:7",text:"Casting all your worries on him, because he cares for you.",context:"You do not have to carry it all",title:"Release what weighs on you",reflection:"Worry can make you feel as though everything depends on you. This verse reminds you that you are cared for. Bring your concerns honestly to God. Asking for help is not weakness; it is an act of trust.",prayer:"Loving God, I bring You the worries I have been carrying. Help me hand over what I cannot control and receive the comfort of knowing I am cared for. Amen."},
  {ref:"Romans 12:12",text:"rejoicing in hope; enduring in troubles; continuing steadfastly in prayer;",context:"Hope that keeps showing up",title:"Keep showing up",reflection:"Hope is more than a feeling on a good day. It is a practice: holding on to what is good, persevering when life is hard and returning to prayer. Small acts of faithfulness matter.",prayer:"Father, keep hope alive in me. Give me endurance through difficult moments and help me stay connected to You in prayer, in gratitude and in everyday life. Amen."},
  {ref:"1 Corinthians 16:14",text:"Let all that you do be done in love.",context:"Let love shape the ordinary",title:"Choose love today",reflection:"Love is not only something we say. It is shown in how we speak, listen, forgive and treat people when no one is watching. Let this simple instruction shape one conversation and one decision at a time.",prayer:"God, let love guide my words and actions today. Help me be patient, generous and quick to show kindness. May the people I meet feel respect and care through the way I treat them. Amen."}
];

const library = [
  {ref:"Psalm 23:1",text:"Yahweh is my shepherd: I shall lack nothing.",tag:"Peace"},
  {ref:"Jeremiah 29:11",text:"For I know the thoughts that I think toward you, says Yahweh, thoughts of peace, and not of evil, to give you hope and a future.",tag:"Hope"},
  {ref:"Matthew 11:28",text:"Come to me, all you who labor and are heavily burdened, and I will give you rest.",tag:"Peace"},
  {ref:"Isaiah 40:31",text:"But those who wait for Yahweh will renew their strength. They will mount up with wings like eagles.",tag:"Strength"},
  {ref:"Romans 8:28",text:"We know that all things work together for good for those who love God.",tag:"Faith"},
  {ref:"1 John 4:19",text:"We love him, because he first loved us.",tag:"Love"},
  {ref:"Hebrews 11:1",text:"Now faith is assurance of things hoped for, proof of things not seen.",tag:"Faith"},
  {ref:"Romans 15:13",text:"Now may the God of hope fill you with all joy and peace in believing.",tag:"Hope"},
  {ref:"Psalm 34:18",text:"Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit.",tag:"Hope"},
  {ref:"John 15:12",text:"This is my commandment, that you love one another, even as I have loved you.",tag:"Love"},
  {ref:"Isaiah 41:10",text:"Don't be afraid, for I am with you. Don't be dismayed, for I am your God.",tag:"Strength"},
  {ref:"Colossians 3:15",text:"And let the peace of God rule in your hearts.",tag:"Peace"}
];

const melbourneDateParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
const melbourneDate = Object.fromEntries(melbourneDateParts.map(part => [part.type, part.value]));
const dayNumber = Math.floor(Date.UTC(Number(melbourneDate.year), Number(melbourneDate.month) - 1, Number(melbourneDate.day)) / 86400000);
const today = dailyContent[((dayNumber % dailyContent.length) + dailyContent.length) % dailyContent.length];
const date = new Date();
document.getElementById("todayDate").textContent = date.toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"});
document.getElementById("dayCount").textContent = "A DAILY REMINDER";
document.getElementById("verseText").textContent = today.text;
document.getElementById("verseReference").textContent = today.ref + " · WEB";
document.getElementById("verseContext").textContent = today.context;
document.getElementById("reflectionTitle").textContent = today.title;
document.getElementById("reflectionText").textContent = today.reflection;
document.getElementById("prayerText").textContent = today.prayer;
document.getElementById("year").textContent = date.getFullYear();

const verseShareText = () => `“${today.text}”\n${today.ref} · World English Bible\n\nDaily Faith`;
const toast = (message) => { const el=document.getElementById("toast"); el.textContent=message; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2200); };
async function copyText(text){try{await navigator.clipboard.writeText(text);toast("Copied to clipboard");}catch(e){toast("Copy is unavailable in this browser");}}
document.getElementById("copyVerse").addEventListener("click",()=>copyText(verseShareText()));
document.getElementById("copyPrayer").addEventListener("click",()=>copyText(today.prayer));
document.getElementById("shareVerse").addEventListener("click",async()=>{
  const data={title:"Daily Faith — Verse of the Day",text:verseShareText()};
  if(navigator.share){try{await navigator.share(data);}catch(e){}}
  else copyText(verseShareText());
});

function renderLibrary(filter="All"){
  const grid=document.getElementById("libraryGrid");
  const items=filter==="All"?library:library.filter(v=>v.tag===filter);
  grid.innerHTML=items.map(v=>`<article class="library-item"><p>“${v.text}”</p><small>${v.ref.toUpperCase()} &nbsp; · &nbsp; ${v.tag.toUpperCase()} &nbsp; · &nbsp; WEB</small></article>`).join("");
}
renderLibrary();
document.getElementById("filters").addEventListener("click",e=>{
  const button=e.target.closest("button[data-filter]");if(!button)return;
  document.querySelectorAll(".filter").forEach(b=>b.classList.remove("active"));
  button.classList.add("active");renderLibrary(button.dataset.filter);
});
document.getElementById("menuToggle").addEventListener("click",()=>document.querySelector(".site-header nav").classList.toggle("open"));
document.querySelectorAll(".site-header nav a").forEach(a=>a.addEventListener("click",()=>document.querySelector(".site-header nav").classList.remove("open")));
