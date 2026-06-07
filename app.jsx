const App = () => {
	const [currencies, setCurrencies] = React.useState([])
	const [rates, setRates] = React.useState([])
	const [ratesTime, setRatesTime] = React.useState(null)
	const [ratesGraph, setRatesGraph] = React.useState({})
	const [showAddPopup, setShowAddPopup] = React.useState(false)
	const [selectedCurrencies, setSelectedCurrencies] = React.useState([])
	const [dragState, setDragState] = React.useState(null)
	const cardRefs = React.useRef([])
	const dragRef = React.useRef(null)

	const [loadingApiData, setLoadingApiData] = React.useState(false)
	
	function loadRates() {
		setLoadingApiData(true)
		fetch('https://api.frankfurter.dev/v2/rates').then(res => res.json()).then(data => {
			setRates(data)
			localStorage.setItem('rates', JSON.stringify(data))
			const now = Date.now()
			setRatesTime(now)
			localStorage.setItem('ratesTime', JSON.stringify(now))
			setLoadingApiData(false)
		}).catch(() => {
			setLoadingApiData(false)
		})
	}
	React.useEffect(() => {
		const savedCurrencies = localStorage.getItem('currencies')
		if (savedCurrencies) {
			setCurrencies(JSON.parse(savedCurrencies))
		} else {
			fetch('https://api.frankfurter.dev/v2/currencies').then(res => res.json()).then(data => {
				setCurrencies(data)
				localStorage.setItem('currencies', JSON.stringify(data))
			})
		}

		const savedRates = localStorage.getItem('rates')
		const savedRatesTime = localStorage.getItem('ratesTime')
		const now = Date.now()
		if (savedRates && savedRatesTime && now - JSON.parse(savedRatesTime) < 12 * 60 * 60 * 1000) {
			setRates(JSON.parse(savedRates))
			setRatesTime(JSON.parse(savedRatesTime))
		} else {
			loadRates()
		}

		const savedSelectedCurrencies = localStorage.getItem('selectedCurrencies')
		if (savedSelectedCurrencies) {
			setSelectedCurrencies(JSON.parse(savedSelectedCurrencies))
		}
	}, [])
	React.useEffect(() => {
		localStorage.setItem('selectedCurrencies', JSON.stringify(selectedCurrencies))
	}, [selectedCurrencies])
	React.useEffect(() => {
		const graph = {};
		for (const { base, quote, rate } of rates) {
			graph[base] ??= [];
			graph[quote] ??= [];
			graph[base].push([quote, rate]);
			graph[quote].push([base, 1 / rate]);
		}
		setRatesGraph(graph)
	}, [rates])

	const addCurrency = (currency) => {
		if (!selectedCurrencies.some(c => c.iso_code === currency.iso_code)) {
			setSelectedCurrencies(prev => [...prev, {...currency}])
		}
	}

	const moveCurrency = (fromIndex, toIndex) => {
		if (fromIndex === toIndex || fromIndex === null || toIndex === null) return

		setSelectedCurrencies(prev => {
			if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex > prev.length) return prev

			const updated = [...prev]
			const [draggedItem] = updated.splice(fromIndex, 1)
			updated.splice(toIndex, 0, draggedItem)
			return updated
		})
	}

	const getPointerTargetIndex = (clientY) => {
		const cards = cardRefs.current.filter(Boolean)
		if (!cards.length) return null

		for (let index = 0; index < cards.length; index++) {
			const rect = cards[index].getBoundingClientRect()
			if (clientY <= rect.bottom) {
				return index
			}
		}

		return cards.length
	}

	const clearDrag = () => {
		dragRef.current = null
		setDragState(null)
		document.body.style.userSelect = ''
		document.body.style.webkitUserSelect = ''
	}

	const handleDragHandlePointerDown = (event, index) => {
		if (event.button !== undefined && event.button !== 0) return

		event.preventDefault()
		event.currentTarget.setPointerCapture?.(event.pointerId)
		document.body.style.userSelect = 'none'
		document.body.style.webkitUserSelect = 'none'

		const nextDragState = {
			fromIndex: index,
			toIndex: index,
			pointerId: event.pointerId,
		}
		dragRef.current = nextDragState
		setDragState(nextDragState)
	}

	const handleDragHandlePointerMove = (event) => {
		const currentDrag = dragRef.current
		if (!currentDrag || currentDrag.pointerId !== event.pointerId) return

		event.preventDefault()
		const toIndex = getPointerTargetIndex(event.clientY)
		if (toIndex === null || toIndex === currentDrag.toIndex) return

		const nextDragState = {...currentDrag, toIndex}
		dragRef.current = nextDragState
		setDragState(nextDragState)
	}

	const handleDragHandlePointerUp = (event) => {
		const currentDrag = dragRef.current
		if (!currentDrag || currentDrag.pointerId !== event.pointerId) return

		event.preventDefault()
		event.currentTarget.releasePointerCapture?.(event.pointerId)
		moveCurrency(currentDrag.fromIndex, currentDrag.toIndex)
		clearDrag()
	}

	const handleDragHandlePointerCancel = (event) => {
		const currentDrag = dragRef.current
		if (!currentDrag || currentDrag.pointerId !== event.pointerId) return

		event.currentTarget.releasePointerCapture?.(event.pointerId)
		clearDrag()
	}

	function convertCurrency(amount, from, to) {
		const queue = [[from, amount]];
		const visited = new Set();
		while (queue.length) {
			const [cur, val] = queue.shift();
			if (cur === to) {
				return +val.toFixed(4);
			}
			if (visited.has(cur)) continue;
			visited.add(cur);
			for (const [next, rate] of ratesGraph[cur] || []) {
				queue.push([next, val * rate]);
			}
		}
		return 0;
	}

	const [currentAmount, setCurrentAmount] = React.useState(0)
	const [currentCurrencyFrom, setCurrentCurrencyFrom] = React.useState(null)
	const handleAmountChange = (amount, fromCurrency) => {
		setCurrentAmount(amount)
		setCurrentCurrencyFrom(fromCurrency.iso_code)
	}

	return (
		<div className="dark:bg-zinc-900 dark:text-white min-h-dvh transition">
			<div className="flex items-center justify-center gap-3 p-4 border-b border-gray-500 select-none">
				<img className="h-9" src="icon.png" draggable={false} />
				<span className="font-bold uppercase text-lg">Currency Converter</span>
			</div>
			{ratesTime && (
				<div className="pt-4 flex items-center justify-center gap-3">
					<span className="text-sm text-gray-500 italic">
						Updated at {new Date(ratesTime).toLocaleString()}
					</span>
					<button className={`cursor-pointer p-1.5 aspect-square border border-gray-500 rounded-lg text-xs
						${loadingApiData ? '' : 'hover:bg-gray-100 transition dark:hover:bg-gray-700'}
					`}
						onClick={() => {loadRates()}} disabled={loadingApiData}
					>
						<i className={`fa-solid fa-arrows-rotate ${loadingApiData ? 'fa-spin' : ''}`}></i>
					</button>
				</div>
			)}
			<div className="p-4 flex flex-col gap-2 w-xl max-w-full mx-auto">
				<div className="
					border border-gray-500 px-4 py-2
					flex gap-2 items-center justify-center
					cursor-pointer rounded-xl
					hover:bg-gray-100 transition select-none
					dark:hover:bg-gray-700
				" onClick={() => setShowAddPopup(true)}
				>
					<i className="fa-solid fa-plus"></i>
					<span>Add Currency</span>
				</div>

				{selectedCurrencies.map((currency, index) => (
					<CurrencyCard
						key={`${currency.iso_code}-${index}`}
						currency={currency}
						index={index}
						value={convertCurrency(currentAmount, currentCurrencyFrom, currency.iso_code)}
						refCallback={element => cardRefs.current[index] = element}
						dragState={dragState}
						onHandlePointerDown={handleDragHandlePointerDown}
						onHandlePointerMove={handleDragHandlePointerMove}
						onHandlePointerUp={handleDragHandlePointerUp}
						onHandlePointerCancel={handleDragHandlePointerCancel}
						onAmountChange={handleAmountChange}
						onRemove={() => setSelectedCurrencies(prev => prev.filter(c => c.iso_code !== currency.iso_code))}
					/>
				))}
			</div>

			{showAddPopup && (
				<AddCurrencyPopup
					currencies={currencies}
					selectedCurrencies={selectedCurrencies}
					onClose={() => setShowAddPopup(false)}
					addCurrency={addCurrency}
				/>
			)}
		</div>
	)
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>)

const CurrencyCard = ({
	currency,
	index,
	value,
	refCallback,
	dragState,
	onHandlePointerDown,
	onHandlePointerMove,
	onHandlePointerUp,
	onHandlePointerCancel,
	onRemove,
	onAmountChange
}) => {
	const isDragged = dragState?.fromIndex === index
	const isDropTarget = dragState?.toIndex === index && dragState?.fromIndex !== index

	const [localVal, setLocalVal] = React.useState("");
	const handleChange = (e) => {
		const raw = e.target.value
		setLocalVal(raw)
		const n = parseFloat(raw)
		if (!isNaN(n) && n >= 0) {
			onAmountChange(n, currency)
		}
		if (raw.trim() === "") {
			onAmountChange(0, currency)
		}
	}

	React.useEffect(() => {
		setLocalVal(value)
	}, [value])

	return (
		<div ref={refCallback}
			className={`animate-[fadeIn_0.2s_ease_backwards]
				border border-gray-500 p-3 rounded-xl flex items-center gap-3 transition
				${isDragged ? 'opacity-50 scale-95' : ''}
				${isDropTarget ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50' : ''}
			`}
		>
			<button type="button"
				aria-label={`Drag ${currency.iso_code}`}
				className="shrink-0 cursor-move touch-none p-2 -m-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 transition"
				onPointerDown={(event) => onHandlePointerDown(event, index)}
				onPointerMove={onHandlePointerMove}
				onPointerUp={onHandlePointerUp}
				onPointerCancel={onHandlePointerCancel}
			>
				<i className="fa-solid fa-bars pointer-events-none"></i>
			</button>
			<div className="flex select-none whitespace-nowrap items-center gap-2 font-mono font-medium">
				<span>{currency.symbol}</span>
				<span>{currency.iso_code}</span>
			</div>
			<div className="flex items-center gap-3 w-full">
				<div className="flex items-center gap-1 w-full">
					<input className="no-spinner text-right outline-none w-full text-black dark:text-white dark:scheme-dark"
						type="number" inputMode="decimal" min="0" placeholder="0"
						value={localVal || ""}
						onChange={handleChange}
					/>
				</div>
				<i className="fa-solid fa-circle-xmark cursor-pointer text-gray-500 hover:text-red-500 transition text-lg"
					onClick={onRemove}
				></i>
			</div>
		</div>
	)
}

const AddCurrencyPopup = ({
	currencies, selectedCurrencies, onClose, addCurrency
}) => {
	const [query, setQuery] = React.useState('')
	const filteredCurrencies = currencies.filter(currency =>
		currency.iso_code.toLowerCase().includes(query.toLowerCase()) || currency.name.toLowerCase().includes(query.toLowerCase())
	).filter(currency => !selectedCurrencies.some(c => c.iso_code === currency.iso_code))

	return (
		<Popup title="Add Currency" width="w-96" onClose={onClose}>
			<div className="grid grid-cols-[theme(spacing.9)_1fr] items-center gap-3 p-3">
				<i className="fa-solid fa-magnifying-glass justify-self-center"></i>
				<input className="outline-none" type="search" placeholder="Code or name..."
					value={query} onChange={e => setQuery(e.target.value)}
				/>
			</div>
			{filteredCurrencies.length > 0 && (
				<div className="max-h-96 overflow-y-auto scrollbar-thin dark:scheme-dark">
					{filteredCurrencies.map((currency, index) => (
						<div key={index} className="
							grid grid-cols-[theme(spacing.9)_1fr] items-center gap-3 p-3 cursor-pointer
							hover:bg-gray-100 transition select-none
							dark:hover:bg-gray-700
						" onClick={() => {addCurrency(currency); onClose()}}>
							<span className="justify-self-center font-mono font-semibold">{currency.iso_code}</span>
							<span>{currency.name}</span>
						</div>
					))}
				</div>
			)}
		</Popup>
	)
}

const Popup = ({children, onClose, title, width}) => {
	const handleClick = (e) => {
		if (e.target === e.currentTarget) {
			onClose()
		}
	}
	return (
		<div className="animate-[fadeIn_0.22s_ease_both] fixed inset-0 bg-black/50 flex items-center justify-center" onClick={handleClick}>
			<div className={`
				animate-[modalIn_0.22s_ease_both]
				bg-white dark:bg-zinc-900 dark:text-white rounded-xl divide-y dark:divide-gray-600 overflow-hidden
				${width} max-w-[calc(100%-theme(spacing.4))]
			`}>
				<h2 className="font-bold p-3 relative text-center select-none">
					<span>{title}</span>
					<div className="absolute top-1/2 transform -translate-y-1/2 right-3 cursor-pointer"
						onClick={onClose}
					>
						<i className="fa-solid fa-circle-xmark text-red-500 text-xl hover:text-red-700 transition"></i>
					</div>
				</h2>
				{children}
			</div>
		</div>
	)
}
