import * as env from "@env";
import * as sys from "@sys";
import * as sciter from "@sciter";

var masterserver = "http://neontflame.especulamente.com.br/jolas";
var versao = '';
var pastaDestino = env.home();

async function doesFileExist(file) {
	try {
		var stat = await sys.fs.stat(file);
		return true;
	} catch (e) {
		return false;
	}
}

async function carregarVersao() {
	try {
		var response = await fetch(
			masterserver + "/download/getLauncherMostRecentVer.php"
		);
		if (!response.ok) {
			throw new Error(`deu pane: ${response.status}`);
		}
		versao = await response.text();
		baixarLauncher(versao);
	} catch (error) {
		document.getElementById("progress").innerHTML = 'Você está offline :P';
		abrirLauncher();
	}
}

// baixa launch

async function listarArquivos(versao) {
	console.log("tentando");
	var resp = await fetch(masterserver + "/download/getLauncherFiles.php?v=" + encodeURIComponent(versao) + "&plat=" + env.PLATFORM);
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
		const url = masterserver + "/download/dlFile.php" + "?version=" + versao + "&file=" + nomeArquivo  + "&where=launcher";
		
		const response = await fetch(url, {
			downloadProgress: function(index, total) {
				var indexMB = Math.round(index * 0.000001);
				var totalMB = Math.round(total * 0.000001);
				document.getElementById("progress").innerHTML = 'Baixando ' + nomeArquivo + '... (' + indexMB + '/' + totalMB + ' MB)';
				document.getElementById("barrinha").style.display = 'block';
				document.getElementById("barrinha").max = totalMB;
				document.getElementById("barrinha").value = indexMB;
			}
		});
		
		const buffer = await response.arrayBuffer();
		
		let file = await sys.fs.open(pastaDestino + "/" + nomeArquivo, "w+", 0o666);
		
		await file.write(buffer);
		await file.close();
	} catch (e) {
		log(e);
	}
}

async function baixarLauncher(versao) {
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
	abrirLauncher();
}

async function abrirLauncher() {
	document.getElementById("progress").innerHTML = 'Abrindo o launcher...';
	document.getElementById("barrinha").style.display = 'none';
	
	var exePath = pastaDestino + "/jolasLauncher.exe";
	if (env.PLATFORM == 'Linux') {
		exePath = pastaDestino + "/jolasLauncher";
	}
	
	env.launch(exePath);
	
	Window.this.close();
}

carregarVersao();