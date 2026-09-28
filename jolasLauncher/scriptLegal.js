import * as env from "@env";
import * as sys from "@sys";
import * as sciter from "@sciter";

var isOnline = true;
var isSelectedDL = false;
var masterserver = "http://neontflame.especulamente.com.br/jolas";
var versao = "2.0.2";

document.getElementById("versionHere").innerText = versao;

/* -------------- SETUP EPICO -------------- */

var pastaDestino = '';
var linguagem = 'pt_BR';
var mods = [];

var servidorPermitido = false;
var servidorPorta = 7000;

/* -------------- UTILITARIOS -------------- */

async function loadTextFromFile(file) {
	console.log('tentativa de carregar ' + file);
	try {
		var buffer = await sys.fs.readfile(file);
		var text = sciter.decode(buffer, "utf-8");
		console.log(text);
		return text;
	} catch (e) {
		console.log("erro lendo:", e);
	}
	return '';
}

async function saveTextToFile(file, text) {
	var stream = await sys.fs.open(file, "w");
	try {
		await stream.write(text);
	} finally {
		await stream.close();
	}
}

async function doesFileExist(file) {
	try {
		var stat = await sys.fs.stat(file);
		return true;
	} catch (e) {
		return false;
	}
}

async function getDirectories(path) {
    var dir = await sys.fs.readdir(path);
    var directories = [];

    while (true) {
		const result = await dir.next();
		if (result.done)
			break;
		
		const entry = result.value;
        if (entry.type === sys.fs.UV_DIRENT_DIR) {
            directories.push(entry.name);
        }
    }
    dir.close();

    return directories;
}

/* -------------- SETUP -------------- */

async function verificarVersaoLauncher() {
	try {
		var response = await fetch(
			masterserver + "/download/getLauncherMostRecentVer.php"
		);
		if (!response.ok) {
			throw new Error(`deu pane: ${response.status}`);
		}
		var versaoCheck = await response.text();
		
		if (versao != versaoCheck) {
			var pregunta = Window.this.modal(<question caption="Versão nova do launcher">{ "Há uma versão nova do launcher disponível! (" + versaoCheck + ")\nVocê gostaria de baixá-la?" }</question>);
			
			if (pregunta == "yes") {
				await abrirAtualizador();
			}
		}
	} catch (error) {
		console.log(error);
	}
}

async function abrirAtualizador() {
	document.getElementById("fileStatus").innerHTML = 'Abrindo o atualizador...';
	document.getElementById("fileStatus").style.display = 'block';
	
	try {
		var exePath = env.home() + "/jolasLauncherUpdate.exe";
		if (env.PLATFORM == 'Linux') {
			exePath = env.home() + "/jolasLauncherUpdate";
		}
		
		await env.exec(exePath);
		
		Window.this.close();
	} catch (e) {
		console.log('fuck');
		console.log(e);
	}
}

async function exeExistsSetup() {
	var exePath = pastaDestino + "/jolas.exe";

	try {
		var stat = await sys.fs.stat(exePath); // throws if it doesn't exist
		PlayWithoutUpdate.disabled = false;
	} catch (e) {
		PlayWithoutUpdate.disabled = true;
	}
}

async function checkIfMostRecent() {
	var versioned = document.getElementById("versaoJogo");
	var coolButt = document.getElementById("updateAndPlay");
	try {
		var vers = await loadTextFromFile(pastaDestino + '/version.txt');
		console.log(vers);
		// eu halucinei isso eu nao sei se ta certo
		if (vers == versioned.value) {
			isSelectedDL = true;
			if (versioned.value == versioned.children[0].value) {
				coolButt.innerHTML = 'Jogar';
			} else {
				coolButt.innerHTML = 'Jogar versão selecionada';
			}
		} else {
			isSelectedDL = false;
			if (versioned.value == versioned.children[0].value) {
				coolButt.innerHTML = 'Atualizar e jogar';
			} else {
				coolButt.innerHTML = 'Baixar e jogar';
			}
		}
		// randomJoar();
		await exeExistsSetup();
	} catch (e) {
		return null;
	}
}

function randomJoar() {
	// infelizmente vamos ter que cortar pq o negocio fucking quebra
	var coolButt = document.getElementById("updateAndPlay");
	
	if (Math.floor(Math.random() * 10) == 1) {
		coolButt.style.fontFamily = 'Comic Sans MS';
		coolButt.style.fontSize = '24px';
		coolButt.innerHTML = 'joar';
	} else {
		coolButt.style.fontFamily = 'sans-serif';
		coolButt.style.fontSize = '12px';
	}
}

/* -------------- CONFIG -------------- */

var configPath = env.home() + '/config.ini';

// https://jsfiddle.net/m71fcgeo/2/
function isWhiteSpace(at){
	if(at === "\t" || at === " "){
  	return true;
  }
}

function parseIniString(file) {
	let index = 0;
	const result = {};
	let section = result;
	let state = "default";
	let keyName = "";
	let value = "";
	let sectionName = "";
	while(index < file.length){
		let at = file[index];
		if(state === "default"){
			if(at === ";"){
				state = "comment";
			} else if(at === "["){
				state = "section";

			} else if(!isWhiteSpace(at)){
				state = "key";
				index--;
			}
			console.log("default to", state);
			index++;
		} else if(state === "key") {
			if(at !== "\n" && at !== "="){
				keyName += at;
			} else if(at === "\n"){
				 state = "default";
				 keyName = "";
			} else {
				state = "value";
			}
			index++;
		} else if(state === "value") {
			if(at !== "\n"){
				value += at;
			} else {
				//End of the line let's do this
				section[keyName] = value;
				keyName = "";
				value = "";
				state = "default";
				
			}
			index++;
		} else if(state == "section") {
			if(at === "]" || at === "\n"){
				result[sectionName] = {};
				section = result[sectionName];
				sectionName = "";
				state = "default"
			} else {
				sectionName += at;
			}
			index++;
		} else if(state === "comment") {
			if(at === "\n"){
				state = "default"
			}
			index++
		}
	}
	
	if (state === "value" && keyName) {
		section[keyName] = value;
	}
	
	return result;
}

// essa seçao foi feita pelo robo maldito
function stringifyIni(obj) {
	var lines = [];
	var sections = [];

	// primeiro escreve as chaves "soltas" (fora de seção)
	for (var key in obj) {
		var value = obj[key];
		if (typeof value === "object" && value !== null) {
			sections.push(key); // guarda pra escrever depois
		} else {
			lines.push(key + "=" + value);
		}
	}

	// depois escreve cada seção
	for (var sectionName of sections) {
		lines.push("[" + sectionName + "]");
		var sectionObj = obj[sectionName];
		for (var key in sectionObj) {
			lines.push(key + "=" + sectionObj[key]);
		}
	}

	return lines.join("\n") + "\n";
}

async function loadIniConfig() {
	try {
		var buffer = await sys.fs.readfile(configPath);
		var text = sciter.decode(buffer, "utf-8");
		var parsed = parseIniString(text);
		
		pastaDestino = parsed.jolasLauncher.JolasFolder;
		linguagem = parsed.jolasLauncher.Language;
		
		servidorPermitido = (parsed.Hosting.IsServer == 'Yes' ? true : false);
		servidorPorta = parsed.Hosting.Port;
		
		document.getElementById("gameLanguage").value = linguagem;
		document.getElementById("svHosting").checked = servidorPermitido;
		document.getElementById("svPort").value = servidorPorta;
		
	} catch (e) {
		console.error("erro lendo ini:", e);
		await saveIniConfig();
		
		return null;
	}
}

async function saveIniConfig() {
	document.getElementById("fileStatus").innerHTML = 'Salvando config...';
	document.getElementById("fileStatus").style.display = 'block';
	
	var text = stringifyIni({
		jolasLauncher: {
			JolasFolder: pastaDestino,
			Language: linguagem
		},
		Hosting: {
			IsServer: (servidorPermitido ? 'Yes' : 'No'),
			Port: servidorPorta
		}
	});
	
	var stream = await sys.fs.open(configPath, "w");
	try {
		await stream.write(text);
		document.getElementById("fileStatus").style.display = 'none';
	} finally {
		await stream.close();
	}
}

/* -------------- ABAS -------------- */
showTab("game");

document.querySelector('#goToGame').addEventListener('click', function(event) {
	console.log("yeah");
	showTab("game");
});

document.querySelector('#goToOptions').addEventListener('click', function(event) {
	console.log("depends");
	showTab("options");
});

document.querySelector('#goToAbout').addEventListener('click', function(event) {
	console.log("nah");
	showTab("about");
});

function showTab(tab) {
	var tabsAvailable = ['game', 'options', 'about'];
	
	for (var i = 0; i < tabsAvailable.length; i++) {
		if (tabsAvailable[i] != tab) document.getElementById(tabsAvailable[i] + "Inside").style.display = 'none';
		else document.getElementById(tabsAvailable[i] + "Inside").style.display = '';
	}
	document.getElementById("mainBody").className = "coolBody " + tab;
}

/* -------------- CARREGAR INFO -------------- */
async function carregarVersoes() {
	document.querySelector("#VerifyUpdate").disabled = true;
	try {
		var response = await fetch(
			masterserver + "/download/getVersions.php"
		);
		if (!response.ok) {
			throw new Error(`deu pane: ${response.status}`);
		}
		document.getElementById("versaoJogo").innerHTML = await response.text();
		document.getElementById("versaoJogo").value = document.getElementById("versaoJogo").children[0].value
		pegarInfoDeVersao(document.getElementById("versaoJogo"))
	} catch (error) {
		console.error("deu pane:", error);
		isOnline = false
		document.getElementById("changelog").innerHTML = 'Você está offline :P';
	}
	
	checkIfMostRecent();
	document.querySelector("#VerifyUpdate").disabled = false;
}

async function pegarInfoDeVersao(tal) {
	if (!isOnline) {
		document.getElementById("changelog").innerHTML = 'Você está offline :P';
		return;
	}
	try {
		var response = await fetch(
			masterserver + "/download/getDesc.php?v=" + tal.value
		);
		if (!response.ok) {
			throw new Error(`deu pane: ${response.status}`);
		}
		document.getElementById("changelog").innerHTML = await response.text();
	} catch (error) {
		console.error("deu pane:", error);
	}
}

var sel = document.$("select#versaoJogo");
sel.onchange = function() {
	pegarInfoDeVersao(this);
	checkIfMostRecent();
}

/* -------------- BAIXAR JOGO -------------- */
async function listarArquivos(versao) {
	console.log("tentando");
	var resp = await fetch(masterserver + "/download/getFiles.php?v=" + encodeURIComponent(versao) + "&plat=" + env.PLATFORM);
	if (!resp.ok) {
		throw new Error(`deu pane: ${resp.status}`);
	}
	var html = await resp.text();
	return html
		.split("<br>")
		.map(s => s.trim())
		.filter(Boolean);
}

async function baixarArquivo(versao, nomeArquivo) {
	try {
		const url = masterserver + "/download/dlFile.php" + "?version=" + versao + "&file=" + nomeArquivo;
		
		const response = await fetch(url, {
			downloadProgress: function(index, total) {
				var indexMB = Math.round(index * 0.000001);
				var totalMB = Math.round(total * 0.000001);
				document.getElementById("fileStatus").innerHTML = 'Baixando ' + nomeArquivo + '... (' + indexMB + '/' + totalMB + ' MB)';
				document.getElementById("fileStatus").style.display = 'block';
			}
		});
		
		const buffer = await response.arrayBuffer();
		
		let file = await sys.fs.open(pastaDestino + "/" + nomeArquivo, "w+", 0o666);
		
		await file.write(buffer);
		await file.close();
		document.getElementById("fileStatus").style.display = 'none';
	} catch (e) {
		log(e);
	}
}

async function baixarJogo(versao) {
	var arquivos = await listarArquivos(versao);

	for (let i = 0; i < arquivos.length; i++) {
		var nome = arquivos[i];
		var destino = pastaDestino + "/" + nome;
		console.log(destino);

		try {
			await baixarArquivo(versao, nome);
		} catch (err) {
			return "Vish"; // tu acha mesmo que da pra continuar baixando mesmo se um deles der errado
		}
	}
	saveTextToFile(pastaDestino + '/version.txt', versao);
	abrirJogo();
}

/* -------------- ABRIR JOGO E BOTOES -------------- */
async function abrirJogo() {
	await saveIniConfig();
	document.getElementById("fileStatus").innerHTML = 'Abrindo jolas...';
	document.getElementById("fileStatus").style.display = 'block';
	
	var exePath = pastaDestino + "/jolas.exe";
	if (env.PLATFORM == 'Linux') {
		exePath = pastaDestino + "/jolas.x86_64";
	}
	
	if (servidorPermitido) {
		env.exec(exePath, '--language', linguagem, '--headless', '--port=' + servidorPorta);
	} else {
		env.exec(exePath, '--language', linguagem);
	}
	
	Window.this.close();
}

var UpdateAndPlay = document.querySelector("#updateAndPlay");
var PlayWithoutUpdate = document.querySelector("#PlayWithoutUpdate");
var VerifyUpdate = document.querySelector("#VerifyUpdate");

UpdateAndPlay.onclick = function() { 
	UpdateAndPlay.disabled = true;
	PlayWithoutUpdate.disabled = true;
	if (isSelectedDL) {
		abrirJogo();
	} else {
		baixarJogo(document.getElementById("versaoJogo").value); 
	}
}

PlayWithoutUpdate.onclick = function() { 
	PlayWithoutUpdate.disabled = true;
	abrirJogo();
}

VerifyUpdate.onclick = function() {
	carregarVersoes();
}

/* ============== SCRIPTS DAS OPÇOES ============== */
/* -------------- MODS -------------- */

async function criarMod(mod, index, checked) {
	var modPath = pastaDestino + '/mods/' + mod
	
	try {
		var jsonString = await loadTextFromFile(modPath + '/metadata.json');
		var modJson = JSON.parse(jsonString);

		var modID = mod;
		var modName = modJson.name;
		var modAuthor = modJson.author;
		
		var modPic = 'elementos/modPlaceholder.png';
		
		if (await doesFileExist(modPath + '/thumb.png')) {
			modPic = 'file://' + modPath + '/thumb.png';
		}
		
		var check = '';
		if (checked) {	check = 'checked';}
		
		var modHTML = `
		<div class="mod" id="${modID}">
			<img src="${modPic}" style="float:left;" />
			
			<div class="modInfo">
				<p class="modName">${modName}</p>
				<p class="modCreator">por ${modAuthor}</p>
			</div>
			
			<input type="checkbox" name="modEnabled" style="float:right; display:table;" ${check}/>
		</div>
		`
		
		document.getElementById("modsHere").innerHTML += modHTML;
		
		var leCheckbox = document.getElementById(modID).children[2];
		
		leCheckbox.addEventListener('change', function(event) {
			if (leCheckbox.checked) {
				mods[index] = modID;
			} else {
				mods[index] = null;
			}
			putModsToTxt()
		});
	} catch (e) {
		console.log('Erm! This shit FAILED');
		console.log(e);
	}
}

var tentouModsDenovo = false;
async function criarMods() {
	try {
		var loadedMods = await loadTextFromFile(pastaDestino + '/loadedMods.txt');
		if (loadedMods != '') {
			mods = loadedMods.split("\n");
		}
		var modsLoaded = await getDirectories(pastaDestino + '/mods/');
		document.getElementById("modsHere").innerHTML = '';
		
		if (modsLoaded.length > 0) {
			var index = 0;
			for (var modLoaded of modsLoaded) {
				console.log("mod!!! " + modLoaded);
				await criarMod(modLoaded, index, mods.includes(modLoaded));
				index += 1;
			}
		} else {
			document.getElementById("modsHere").innerHTML = '<center>Você não tem nenhum mod baixado ainda!</center>'
		}
		
		tentouModsDenovo = false;
		return;
	} catch(e) {
		console.log(e);
	}

	if (!tentouModsDenovo) {
		tentouModsDenovo = true;
		try {
			await sys.fs.mkdir(pastaDestino + '/mods');
			await saveTextToFile(pastaDestino + '/loadedMods.txt', '');
			criarMods();
		} catch(e) {
			console.log("seu pc ta bichado mano so isso que eu posso te dizer");
			console.log(e);
		}
	}
}

async function putModsToTxt() {
	try {
		var theStringle = '';
		
		for (var modLoaded of mods) {
			if (modLoaded != null) {
				theStringle += modLoaded + "\n";
			}
		}
		
		await saveTextToFile(pastaDestino + '/loadedMods.txt', theStringle)
		console.log("wrote: " + theStringle);
	} catch(e) {
		console.log("Unwritten fuckshit");
	}
}

////////////// Fucking Botoes //////////////
var gameLanguage = document.getElementById("gameLanguage");

gameLanguage.addEventListener('change', function(event) {
	linguagem = gameLanguage.value;
	saveIniConfig();
});


var changeLocation = document.querySelector("#changeLocation");

changeLocation.onclick = async function() { 
	// 500 try catches
	try {
		var pasta = await Window.this.selectFolder({
			caption: "Onde você quer seu jolas.?",
			path: pastaDestino
		});
		
		if (pasta) {
			pastaDestino = unescape(pasta.slice(7));
			await refresh();
		}
	} catch(e) {
		console.log("erro: " + e);
	}
}

var svHosting = document.getElementById("svHosting");

svHosting.addEventListener('change', function(event) {
	servidorPermitido = svHosting.checked;
	saveIniConfig();
});

var svPort = document.getElementById("svPort");

svPort.addEventListener('change', function(event) {
	servidorPorta = svPort.value;
	saveIniConfig();
});

/* -------------- OUTROS TRECOS MANEIROS -------------- */

/* -------------- SETUPS QUE RODAM QUANDO O SCRIPT JA TA CARREGADO -------------- */

//  RODAR QUANDO MUDAR PASTA DO JOGO!!!
async function refresh() {
	await saveIniConfig();
	document.getElementById("gameLocation").innerText = pastaDestino;
	await exeExistsSetup();
	await criarMods();
}

async function setup() {
	await verificarVersaoLauncher();
	await loadIniConfig();
	await carregarVersoes();
	UpdateAndPlay.disabled = false;
	await refresh();
}

setup();