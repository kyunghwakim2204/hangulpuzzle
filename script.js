/* Korean Word Search Generator */
const DATASETS = {
  animals: "data/animals.json",
  vehicles: "data/vehicles.json",
  foods: "data/foods.json",
  objects: "data/objects.json",
  countries: "data/countries.json",
};

const DIFFICULTY = {
  easy: 6,   // 6x6
  medium: 8, // 8x8
  hard: 10,  // 10x10
};

// Filler characters: common Hangul syllables
const FILLER = Array.from("가나다라마바사아자차카타파하바다라마사아자카타라바사아라다마나");

// Directions: [dx, dy]
const DIRECTIONS = [
  [1,0], [-1,0], [0,1], [0,-1], // straight
  [1,1], [-1,-1], [1,-1], [-1,1] // diagonals
];

const gridEl = document.getElementById("grid");
const wordlistEl = document.getElementById("wordlist");
const difficultyEl = document.getElementById("difficulty");
const categoryEl = document.getElementById("category");
const wordCountEl = document.getElementById("wordCount");
const statsEl = document.getElementById("stats");

let currentWords = [];
let solutionCells = new Set();
let gridSize = DIFFICULTY.easy;
let grid = [];

async function fetchJSON(path){
  const res = await fetch(path);
  return res.json();
}

async function loadStats(){
  statsEl.innerHTML = "";
  for(const [key, path] of Object.entries(DATASETS)){
    try{
      const arr = await fetchJSON(path);
      const li = document.createElement("li");
      li.textContent = `${labelOf(key)}: ${arr.length}개`;
      statsEl.appendChild(li);
    }catch(e){
      const li = document.createElement("li");
      li.textContent = `${labelOf(key)}: 로드 실패`;
      statsEl.appendChild(li);
    }
  }
}
function labelOf(key){
  return {animals:"동물", vehicles:"탈것", foods:"음식", objects:"사물", countries:"나라"}[key] || key;
}

function createEmptyGrid(size){
  return Array.from({length:size}, () => Array.from({length:size}, () => ""));
}
function inBounds(x,y,size){ return x>=0 && y>=0 && x<size && y<size; }

function canPlace(word, x, y, dx, dy, board){
  const size = board.length;
  for(let i=0;i<word.length;i++){
    const nx = x + dx*i, ny = y + dy*i;
    if(!inBounds(nx,ny,size)) return false;
    const cell = board[ny][nx];
    if(cell !== "" && cell !== word[i]) return false;
  }
  return true;
}
function placeWord(word, board, markPositions){
  const size = board.length;
  const dirs = shuffle([...DIRECTIONS]);
  for(const [dx,dy] of dirs){
    // try random positions
    for(let tries=0; tries<200; tries++){
      const x = Math.floor(Math.random()*size);
      const y = Math.floor(Math.random()*size);
      if(canPlace(word,x,y,dx,dy,board)){
        for(let i=0;i<word.length;i++){
          const nx = x + dx*i, ny = y + dy*i;
          board[ny][nx] = word[i];
          if(markPositions){ markPositions(nx, ny); }
        }
        return true;
      }
    }
  }
  return false;
}
function fillBoard(board){
  const size = board.length;
  for(let y=0;y<size;y++){
    for(let x=0;x<size;x++){
      if(board[y][x] === ""){
        board[y][x] = FILLER[(Math.random()*FILLER.length)|0];
      }
    }
  }
}
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}
function pickWords(all, maxLen){
  // prefer shorter words to fit small grids
  const copy = [...all].filter(w => w.length <= maxLen);
  return shuffle(copy);
}
function renderBoard(board){
  gridEl.innerHTML = "";
  gridEl.style.gridTemplateColumns = `repeat(${board.length}, 40px)`;
  for(let y=0;y<board.length;y++){
    for(let x=0;x<board.length;x++){
      const div = document.createElement("div");
      div.className = "cell";
      div.dataset.x = x; div.dataset.y = y;
      div.textContent = board[y][x];
      gridEl.appendChild(div);
    }
  }
}
function renderWordList(words){
  wordlistEl.innerHTML = "<h3>찾을 단어</h3>";
  words.forEach(w => {
    const div = document.createElement("div");
    div.className = "word";
    div.textContent = "• " + w;
    wordlistEl.appendChild(div);
  });
}

async function buildPuzzle(selectNewWords=true){
  const size = DIFFICULTY[difficultyEl.value];
  gridSize = size;
  const path = DATASETS[categoryEl.value];
  const all = await fetchJSON(path);

  // word count
  const count = Math.max(4, Math.min(20, parseInt(wordCountEl.value || "8", 10)));
  // choose or reuse words
  let words;
  if(selectNewWords || !window.currentWords || window.currentWords.length===0){
    const pool = pickWords(all, Math.max(3, Math.floor(size*0.8)));
    words = shuffle(pool).slice(0, count);
    window.currentWords = words;
  } else {
    // reuse existing bank, but clamp to current count setting
    const trimmed = [...window.currentWords].slice(0, count);
    words = trimmed.length ? trimmed : window.currentWords;
  }

  // split each word into characters (Hangul syllables)
  const charsWords = words.map(w => Array.from(w));

  let attempt = 0;
  solutionCells = new Set();
  while(attempt < 200){
    const board = createEmptyGrid(size);
    let ok = true;
    for(const cw of charsWords){
      const withReverse = Math.random() < 0.4 ? [...cw].reverse() : cw;
      if(!placeWord(withReverse, board, (x,y)=>solutionCells.add(`${x},${y}`))){
        ok = false; break;
      }
    }
    if(ok){
      fillBoard(board);
      grid = board;
      currentWords = words;
      renderBoard(board);
      renderWordList(words);
      clearHits();
      return;
    }
    attempt++;
  }
  alert("퍼즐 생성에 실패했어요. 단어 수를 줄이거나 난이도를 바꿔보세요.");
}

document.getElementById("generate").addEventListener("click", () => buildPuzzle(true));
document.getElementById("print").addEventListener("click", () => window.print());

// init
loadStats().then(buildPuzzle);


function clearHits(){
  gridEl.querySelectorAll('.cell.hit').forEach(c => c.classList.remove('hit'));
}
function revealSolution(){
  clearHits();
  const cells = gridEl.querySelectorAll('.cell');
  cells.forEach(cell => {
    const x = cell.dataset.x, y = cell.dataset.y;
    if(solutionCells.has(`${x},${y}`)) cell.classList.add('hit');
  });
}


try{ document.getElementById("reveal").addEventListener("click", revealSolution); }catch(e){}
