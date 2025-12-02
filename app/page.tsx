"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronUp, ChevronDown, BarChart2, ChevronLeft, ChevronRight, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

// Type pour les données d'une partie
type GameData = {
  loto: number[]
  lastLoto: number | null
}

export default function BingoLoto() {
  // État pour les numéros tirés par partie
  const [gameData, setGameData] = useState<Record<string, GameData>>({})
  const [bingoNumbers, setBingoNumbers] = useState<number[]>([])
  const [lastNumber, setLastNumber] = useState<number | null>(null)
  const [lastBingoNumber, setLastBingoNumber] = useState<number | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [currentGame, setCurrentGame] = useState(1)
  const [totalGames, setTotalGames] = useState(1)
  const [isAlternativeView, setIsAlternativeView] = useState(false)
  const [isEraseMode, setIsEraseMode] = useState({ loto: false, bingo: false })
  const [statistics, setStatistics] = useState<{ [key: number]: number }>({})
  const [isIndicatorRed, setIsIndicatorRed] = useState(false)
  const lastNumberRef = useRef<HTMLDivElement>(null)
  const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Obtenir les données de la partie actuelle
  const getCurrentGameData = (): GameData => {
    const gameKey = currentGame.toString()
    return gameData[gameKey] || { loto: [], lastLoto: null }
  }

  // Obtenir les numéros Loto de la partie actuelle
  const getCurrentLotoNumbers = (): number[] => {
    return getCurrentGameData().loto
  }

  // Obtenir le dernier numéro Loto de la partie actuelle
  const getCurrentLastLoto = (): number | null => {
    return getCurrentGameData().lastLoto
  }

  // Mettre à jour les données de la partie actuelle
  const updateCurrentGameData = (data: Partial<GameData>) => {
    const gameKey = currentGame.toString()
    const currentData = getCurrentGameData()

    setGameData((prev) => ({
      ...prev,
      [gameKey]: {
        ...currentData,
        ...data,
      },
    }))
  }

  // Charger l'état du jeu au démarrage
  useEffect(() => {
    const savedState = localStorage.getItem("bingoLotoState")
    if (savedState) {
      const { gameData, bingo, lastNum, lastBingo, currentGame, totalGames, stats } = JSON.parse(savedState)
      setGameData(gameData || {})
      setBingoNumbers(bingo || [])
      setLastNumber(lastNum || null)
      setLastBingoNumber(lastBingo || null)
      setCurrentGame(currentGame || 1)
      setTotalGames(totalGames || 1)
      setStatistics(stats || {})
    } else {
      // Initialiser avec des valeurs par défaut au premier démarrage
      setTotalGames(1)
      setGameData({
        "1": { loto: [], lastLoto: null },
      })
    }
  }, [])

  // Sauvegarder l'état du jeu à chaque changement
  useEffect(() => {
    localStorage.setItem(
      "bingoLotoState",
      JSON.stringify({
        gameData,
        bingo: bingoNumbers,
        lastNum: lastNumber,
        lastBingo: lastBingoNumber,
        currentGame,
        totalGames,
        stats: statistics,
      }),
    )

    // Écrire le dernier numéro dans un élément qui pourrait être utilisé pour générer un fichier texte
    if (lastNumberRef.current && lastNumber !== null) {
      lastNumberRef.current.textContent = `${lastNumber}`
    }
  }, [gameData, bingoNumbers, lastNumber, lastBingoNumber, currentGame, totalGames, statistics])

  // Activer l'indicateur rouge pendant 5 secondes
  const triggerRedIndicator = () => {
    // Annuler le timeout précédent s'il existe
    if (indicatorTimeoutRef.current) {
      clearTimeout(indicatorTimeoutRef.current)
    }

    // Passer au rouge
    setIsIndicatorRed(true)

    // Repasser au vert après 5 secondes
    indicatorTimeoutRef.current = setTimeout(() => {
      setIsIndicatorRed(false)
    }, 5000)
  }

  // Gérer le clic sur un numéro
  const handleNumberClick = (number: number, isRightClick = false) => {
    const currentLotoNumbers = getCurrentLotoNumbers()

    // Déclencher l'indicateur rouge pour tout clic (sauf en mode effacement)
    if (!isEraseMode.loto || isRightClick) {
      triggerRedIndicator()
    }

    if (isEraseMode.loto && !isRightClick) {
      // Mode effacement pour Loto
      const newLotoNumbers = currentLotoNumbers.filter((n) => n !== number)

      let newLastLoto = getCurrentLastLoto()
      if (newLastLoto === number) {
        newLastLoto = currentLotoNumbers.length > 1 ? currentLotoNumbers[currentLotoNumbers.indexOf(number) - 1] : null
      }

      updateCurrentGameData({
        loto: newLotoNumbers,
        lastLoto: newLastLoto,
      })

      if (lastNumber === number) {
        setLastNumber(newLastLoto)
      }

      return
    }

    if (isEraseMode.bingo && isRightClick) {
      // Mode effacement pour Bingo
      setBingoNumbers((prev) => prev.filter((n) => n !== number))
      if (lastBingoNumber === number) {
        const newLastBingo = bingoNumbers.length > 1 ? bingoNumbers[bingoNumbers.indexOf(number) - 1] : null
        setLastBingoNumber(newLastBingo)
      }
      return
    }

    if (isRightClick) {
      // Clic droit pour Bingo (ajoute aussi à Loto)
      if (!bingoNumbers.includes(number)) {
        setBingoNumbers((prev) => [...prev, number])
        setLastBingoNumber(number)

        if (!currentLotoNumbers.includes(number)) {
          const newLotoNumbers = [...currentLotoNumbers, number]
          updateCurrentGameData({
            loto: newLotoNumbers,
            lastLoto: number,
          })
          setLastNumber(number)
          updateStatistics(number)
        }
      }
    } else {
      // Clic gauche pour Loto
      if (!currentLotoNumbers.includes(number)) {
        const newLotoNumbers = [...currentLotoNumbers, number]
        updateCurrentGameData({
          loto: newLotoNumbers,
          lastLoto: number,
        })
        setLastNumber(number)
        updateStatistics(number)
      }
    }
  }

  // Mettre à jour les statistiques
  const updateStatistics = (number: number) => {
    setStatistics((prev) => ({
      ...prev,
      [number]: (prev[number] || 0) + 1,
    }))
  }

  // Démarrer une nouvelle partie
  const startNewGame = () => {
    const nextGame = currentGame + 1

    // Initialiser la nouvelle partie si elle n'existe pas déjà
    if (!gameData[nextGame.toString()]) {
      setGameData((prev) => ({
        ...prev,
        [nextGame.toString()]: { loto: [], lastLoto: null },
      }))
    }

    // Mettre à jour le compteur de parties
    setCurrentGame(nextGame)
    if (nextGame > totalGames) {
      setTotalGames(nextGame)
    }

    // Réinitialiser le dernier numéro tiré
    setLastNumber(null)
  }

  // Naviguer vers une partie spécifique
  const navigateToGame = (gameNumber: number) => {
    if (gameNumber < 1 || gameNumber > totalGames) return

    // Initialiser la partie si elle n'existe pas déjà
    if (!gameData[gameNumber.toString()]) {
      setGameData((prev) => ({
        ...prev,
        [gameNumber.toString()]: { loto: [], lastLoto: null },
      }))
    }

    setCurrentGame(gameNumber)

    // Mettre à jour le dernier numéro tiré
    const gameDataForNumber = gameData[gameNumber.toString()]
    setLastNumber(gameDataForNumber?.lastLoto || null)
  }

  // Réinitialiser Loto pour la partie actuelle
  const resetLoto = () => {
    updateCurrentGameData({
      loto: [],
      lastLoto: null,
    })
    setLastNumber(null)
  }

  // Réinitialiser Bingo
  const resetBingo = () => {
    setBingoNumbers([])
    setLastBingoNumber(null)
  }

  // Réinitialiser les statistiques
  const resetStatistics = () => {
    setStatistics({})
  }

  // Télécharger les statistiques au format CSV
  const downloadStatistics = () => {
    // Créer les données CSV
    let csvContent = "Numéro,Nombre de tirages\n"

    // Ajouter tous les numéros de 1 à 90
    for (let num = 1; num <= 90; num++) {
      const count = statistics[num] || 0
      csvContent += `${num},${count}\n`
    }

    // Créer un blob et télécharger le fichier
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    link.setAttribute("href", url)
    link.setAttribute("download", `statistiques_loto_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = "hidden"

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Générer les grilles de numéros
  const renderNumberGrid = () => {
    const numbers = Array.from({ length: 90 }, (_, i) => i + 1)
    const rowSize = isAlternativeView ? 10 : 15
    const rows = []
    const currentLotoNumbers = getCurrentLotoNumbers()

    for (let i = 0; i < numbers.length; i += rowSize) {
      const rowNumbers = numbers.slice(i, i + rowSize)
      rows.push(
        <div key={i} className="flex justify-start gap-2 mb-2">
          {rowNumbers.map((number) => (
            <button
              key={number}
              className={`
                w-16 h-16 rounded-full flex items-center justify-center text-base font-bold
                ${currentLotoNumbers.includes(number) ? "bg-black text-white" : "bg-gradient-to-br from-white to-gray-100 text-black"}
                ${bingoNumbers.includes(number) ? "ring-2 ring-red-500 ring-offset-2" : ""}
                border-2 border-gray-300 transition-all shadow-sm hover:shadow-md
              `}
              onClick={() => handleNumberClick(number)}
              onContextMenu={(e) => {
                e.preventDefault()
                handleNumberClick(number, true)
              }}
            >
              {number}
            </button>
          ))}
        </div>,
      )
    }

    return <div className="mt-4">{rows}</div>
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50">
      <div className="max-w-10xl mx-auto bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-gray-200 relative">
        {/* Indicateur de clic en haut à gauche */}
        <div className="absolute top-4 left-4">
          <div
            className={`w-8 h-8 rounded-full transition-colors duration-300 shadow-lg ${
              isIndicatorRed ? "bg-red-500" : "bg-green-500"
            }`}
          />
        </div>

        {/* Compteur de numéros tirés en haut à droite */}
        <div className="absolute top-4 right-4 bg-gradient-to-br from-blue-100 to-purple-100 px-4 py-2 rounded-lg shadow-lg border-2 border-white">
          <span className="text-sm font-medium">Tirés: </span>
          <span className="font-bold text-lg">{getCurrentLotoNumbers().length}/90</span>
        </div>

        <h1 className="text-3xl font-bold text-center mb-6">Bingo / Loto</h1>

        {/* Affichage des derniers numéros */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Derniers numéros tirés</h2>
          <div className="flex justify-center items-center gap-8">
            {/* Dernier numéro tiré (principal) */}
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium mb-1">Dernier Tiré</span>
              <div
                ref={lastNumberRef}
                className="text-6xl font-bold bg-gradient-to-br from-blue-100 to-purple-100 rounded-full w-24 h-24 flex items-center justify-center shadow-md border-2 border-white"
              >
                {lastNumber || "-"}
              </div>
            </div>

            {/* Dernier numéro Bingo */}
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium mb-1">Dernier Bingo</span>
              <div className="text-3xl font-bold bg-gradient-to-br from-red-100 to-red-200 rounded-full w-16 h-16 flex items-center justify-center shadow-md border-2 border-white ring-2 ring-red-500 ring-offset-2">
                {lastBingoNumber || "-"}
              </div>
            </div>
          </div>
        </div>

        {/* Conteneur flex pour panneau de contrôle à gauche et grille à droite */}
        <div className="flex gap-6">
          {/* Panneau de contrôle - À gauche */}
          <div className="flex-shrink-0" style={{ width: "320px" }}>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold">Panneau de contrôle</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsPanelOpen(!isPanelOpen)}>
                {isPanelOpen ? <ChevronUp /> : <ChevronDown />}
              </Button>
            </div>

            {isPanelOpen && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg shadow-inner border border-gray-200">
                <div className="flex flex-col gap-4">
                  <div>
                    <Button onClick={startNewGame} className="w-full mb-2">
                      Nouvelle Partie
                    </Button>
                    <div className="flex justify-center mt-2">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => navigateToGame(currentGame - 1)}
                          disabled={currentGame <= 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center space-x-2">
                          <Label htmlFor="game-count">Partie:</Label>
                          <Input
                            id="game-count"
                            type="number"
                            value={currentGame}
                            onChange={(e) => navigateToGame(Number(e.target.value))}
                            className="w-16"
                          />
                          <span>/</span>
                          <Input
                            type="number"
                            value={totalGames}
                            onChange={(e) => setTotalGames(Number(e.target.value))}
                            className="w-16"
                          />
                        </div>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => navigateToGame(currentGame + 1)}
                          disabled={currentGame >= totalGames}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Indicateur de numéros par partie */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Array.from({ length: totalGames }, (_, i) => i + 1).map((game) => {
                        const gameHasNumbers = gameData[game.toString()]?.loto.length > 0
                        return (
                          <Badge
                            key={game}
                            variant={currentGame === game ? "default" : gameHasNumbers ? "secondary" : "outline"}
                            className="cursor-pointer"
                            onClick={() => navigateToGame(game)}
                          >
                            {game}
                            {gameHasNumbers && <span className="ml-1">({gameData[game.toString()]?.loto.length})</span>}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-col space-y-2">
                      <Button
                        variant={isEraseMode.loto ? "destructive" : "outline"}
                        onClick={() => setIsEraseMode((prev) => ({ ...prev, loto: !prev.loto }))}
                        className="w-full"
                      >
                        {isEraseMode.loto ? "Mode Effacement Loto" : "Activer Effacement Loto"}
                      </Button>
                      <Button variant="destructive" onClick={resetLoto} className="w-full">
                        Réinitialiser Loto
                      </Button>
                      <Button
                        variant={isEraseMode.bingo ? "destructive" : "outline"}
                        onClick={() => setIsEraseMode((prev) => ({ ...prev, bingo: !prev.bingo }))}
                        className="w-full"
                      >
                        {isEraseMode.bingo ? "Mode Effacement Bingo" : "Activer Effacement Bingo"}
                      </Button>
                      <Button variant="destructive" onClick={resetBingo} className="w-full">
                        Réinitialiser Bingo
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Switch id="view-mode" checked={isAlternativeView} onCheckedChange={setIsAlternativeView} />
                      <Label htmlFor="view-mode" className="text-sm">
                        {isAlternativeView ? "10/ligne" : "15/ligne"}
                      </Label>
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          <BarChart2 className="mr-2 h-4 w-4" />
                          Statistiques
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Statistiques des tirages</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto">
                          {Array.from({ length: 90 }, (_, i) => i + 1).map((num) => (
                            <div key={num} className="flex flex-col items-center p-2 border rounded">
                              <span className="font-bold">{num}</span>
                              <span>{statistics[num] || 0}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" onClick={downloadStatistics} className="flex-1">
                            <Download className="mr-2 h-4 w-4" />
                            Télécharger CSV
                          </Button>
                          <Button variant="destructive" onClick={resetStatistics} className="flex-1">
                            Réinitialiser
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <div className="flex items-center justify-center mt-2">
                      <div>
                        <span className="text-sm font-medium">Tirés: </span>
                        <span className="font-bold">{getCurrentLotoNumbers().length}/90</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Grille de numéros - À droite */}
          <div className="flex-1">
            {renderNumberGrid()}
          </div>
        </div>
      </div>
    </div>
  )
}
