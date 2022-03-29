<script>
import Game from "./game.svelte"
import runder from "./game.svelte"

$: if(antall_runder == runder && ingame){
	ferdig = true 
	ingame = !ingame
}
let antall_runder
let ferdig = false
let ingame = false
function spillet(){
	ingame = !ingame
}
console.log(runder)
</script>

{#if !ingame && !ferdig}
<main>
	<h1>Vennligst velg antall runder</h1>
	<input bind:value="{antall_runder}">
	<button on:click="{spillet}">Neste</button>
</main>
{/if}
{#if ingame && !ferdig}
<Game></Game>
{/if}
{#if ferdig}
<main>
<h1> du er ferdig! </h1>
</main>
{/if}
<style>
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