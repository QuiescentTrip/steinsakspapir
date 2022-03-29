<script>
	let runder = 0
	let msg = ""
	let vunnet = 0 
	let papir = "./bilder/papir.jpg"
	let saks = "./bilder/saks.jpg"
	let stein = "./bilder/stein.jpg"
	let AI_bilde = ""
	let pc_valg
	let list = [stein, saks, papir]
function vant(){
msg = "Du vant!"
runder += 1
vunnet += 1
}
function tapte(){
msg = "Du tapte!"
runder += 1
vunnet += 0
}
function ujevnt(){
msg = "Ujevnt!"
runder += 1
vunnet += 0.5
}
	function spillstein(){
		pc_valg = Math.floor(Math.random() * 3);
		if(pc_valg == 0){ujevnt()}else if(pc_valg == 1){vant()}else{tapte()}
		AI_bilde = list[pc_valg]
	}
	function spillsaks(){
		pc_valg = Math.floor(Math.random() * 3);
		if(pc_valg == 1){ujevnt()}else if(pc_valg == 2){vant()}else{tapte()}
		AI_bilde = list[pc_valg]
	}
	function spillpapir(){
		pc_valg = Math.floor(Math.random() * 3);
		if(pc_valg == 2){ujevnt()}else if(pc_valg == 0){vant()}else{tapte()}
		AI_bilde = list[pc_valg]
	}

</script>

<main>
{#if msg == ""}
	<h1>Stein Saks Papir!</h1>
{/if}
	<h1>{msg}</h1>
	<div>
	<button id="stein" on:click="{spillstein}">
		<img src="{stein}" alt="stein">
	</button>
	<button id="saks" on:click="{spillsaks}">
		<img src="{saks}" alt="saks">
	</button>
	<button id="papir" on:click="{spillpapir}">
		<img src="{papir}" alt="papir">
	</button>
	</div>
	<p> Du har vunnet {vunnet} ut av {runder} runder</p>
	{#if msg != ""}
	<h1>PC valgte</h1>
	<img src="{AI_bilde}" alt="pc_bilde">
	{/if}
</main>

<style>
	button, img{
		width:200px;
		height: 200px;
		overflow: hidden;
	}
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}
	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}
	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>