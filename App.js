const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios')
const fs = require('fs')
const cors = require('cors')

const app = express()
app.use(bodyParser.json())
app.use(cors())


const getPokemon = async (data, id) => {
	console.log(`🚀 ~ getPokemon ~ id`, id)
	return await data.find(data => data.id == id || data.name === id)
	// console.log(`🚀 ~ getPokemon ~ findData`, findData)
	// return findData;
}

const getKantoData = () => fs.readFileSync("data/kanto-area.json", 'utf8', { endoding: 'utf8' })

const getKantoArea = async () => {
	let allAreas = []
	const res = await axios.get('https://pokeapi.co/api/v2/region/1');
	await res.data.locations.map(async e => {
		const locationData = await axios.get(e.url)
		const areas = locationData.data.areas.map(area => area.url)
		allAreas.push(...areas)
	})

	return allAreas
}

const checkPokemonInArea = async (key) => {

	let kantoArea = undefined
	let checkExistFile = true
	let kantoData = await JSON.parse(await getKantoData())
	if (!kantoData.length) {
		checkExistFile = false
		kantoArea = await getKantoArea()
		// console.log(`🚀 ~ checkPokemonInArea ~ kantoArea`, kantoArea)
	}
	else
		kantoArea = kantoData

	const resEncounter = await axios.get('https://pokeapi.co/api/v2/pokemon/' + key + '/encounters')
	const dataEncounter = resEncounter.data.map(e => e.location_area.url)
	let checker = false
	await dataEncounter.map(pokenEncounter => {
		if (kantoArea.includes(pokenEncounter)) {
			checker = true
		}
	})

	if (!checkExistFile)
		await fs.writeFile("data/kanto-area.json", JSON.stringify(kantoArea), 'utf8', function (err) { })

	return [checker, dataEncounter]
}

const getPokemonData = async (key) => {
	const resPokemon = await axios.get('https://pokeapi.co/api/v2/pokemon/' + key)
	const dataPokemon = resPokemon.data
	const dataEncounter = await checkPokemonInArea(key)

	let pokemonStruct = {
		"id": dataPokemon.id,
		"name": dataPokemon.forms[0].name,
		"encounter": dataEncounter[1],
		"stats": dataPokemon.stats.map(e => {
			return ({
				detail: "Base stat: " + e.base_stat + " Effort: " + e.effort,
				name: e.stat.name,
			})
		}),
		"types": dataPokemon.types.map(type => type.type.name),
		"image": dataPokemon.sprites.front_default,
		"created_date": new Date(),
	}

	return [dataEncounter[0], pokemonStruct]
}

app.get('/pokemon/:name', async (req, res) => {
	let pathFile = "data/pokemon.json"
	await fs.readFile(pathFile, 'utf8', async (error, data) => {
		if (error) {
			res.status(404)
			res.json({ error: "An error occurred while request pokemon data." })
		}

		let dataPokemon = await JSON.parse(data)
		const pokemonData = await getPokemon(dataPokemon, req.params.name)
		await console.log(`🚀 ~ awaitfs.readFile ~ pokemonData`, pokemonData)

		if (pokemonData === undefined) {
			let dataStructPokemon = await getPokemonData(req.params.name)
			if (dataStructPokemon[0]) {
				dataPokemon.push(dataStructPokemon[1])

				await fs.writeFile(pathFile, JSON.stringify(dataPokemon), 'utf8', (err) => {
					if (err) {
						res.status(404)
						res.json({ error: "An error occurred while request pokemon data." })
					}
					res.json(dataStructPokemon[1])
				})
			}
			else {
				res.status(404)
				res.json({ error: "Pokemon can't encounter in Kanto or Invalid input." })
			}
		}
		else {
			let currentDate = new Date().getTime()
			let apiDate = new Date(pokemonData.created_date).getTime()
			let differenceDays = Math.floor((currentDate - apiDate) / (1000 * 3600 * 24))
			if (differenceDays >= 7) {
				let dataStructPokemon = await getPokemonData(req.params.name)
				if (dataStructPokemon[0]) {
					dataPokemon = await dataPokemon.map(e => {
						return (e.id == req.params.name) ? dataStructPokemon[1] : (e.name === req.params.name) ? dataStructPokemon[1] : e
					})

					await fs.writeFile(pathFile, JSON.stringify(dataPokemon), 'utf8', function (err) {
						if (err) {
							res.status(404)
							res.json({ error: "An error occurred while request pokemon data." })
						}
						res.json(dataStructPokemon[1])
					})
				}
				else {
					res.status(404)
					res.json({ error: "Pokemon can't encounter in Kanto or Invalid input." })
				}
			}
			else res.json(pokemonData)
		}
	})
})

var server = app.listen(3001, function () {
	var host = server.address().address
	var port = server.address().port

	console.log("App listening at http://%s:%s", host, port)
})
