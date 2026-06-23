const App = () => {
	const [currencies, setCurrencies] = React.useState([])
	const [rates, setRates] = React.useState([])
	const [ratesTime, setRatesTime] = React.useState(null)
	const [ratesGraph, setRatesGraph] = React.useState({})
	const [showAddPopup, setShowAddPopup] = React.useState(false)
	const [showAddButton, setShowAddButton] = React.useState(true)
	const [selectedCurrencies, setSelectedCurrencies] = React.useState([])
	const [loadingApiData, setLoadingApiData] = React.useState(false)
	
	function loadRates() {
		setLoadingApiData(true)
		fetch('https://api.frankfurter.dev/v2/rates', {cache: 'reload'}).then(res => res.json()).then(data => {
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
		if (savedRates){
			setRates(JSON.parse(savedRates))

			const savedRatesTime = localStorage.getItem('ratesTime')
			const now = Date.now()
			if (savedRatesTime && now - JSON.parse(savedRatesTime) < 12 * 60 * 60 * 1000) {
				setRatesTime(JSON.parse(savedRatesTime))
			} else {
				loadRates()
			}
		} else {
			loadRates()
		}
	}, [])
	React.useEffect(() => {
		if (currencies.length > 0) {
			const savedSelectedCurrencies = localStorage.getItem('selectedCurrencies')
			const currencies_list = savedSelectedCurrencies && JSON.parse(savedSelectedCurrencies).length > 0 ?
				JSON.parse(savedSelectedCurrencies) : ["eur", "usd"]
			setSelectedCurrencies(currencies_list.map(iso_code => currencies.find(c => c.iso_code.toLowerCase() === iso_code.toLowerCase())).filter(Boolean))
		}
	}, [currencies])
	React.useEffect(() => {
		if (currencies.length > 0) {
			localStorage.setItem('selectedCurrencies', JSON.stringify(selectedCurrencies.map(c => c.iso_code.toLowerCase())))
		}
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
	
	React.useEffect(() => {
		let lastScrollY = window.scrollY;
		const handleScroll = () => {
			if (window.scrollY > lastScrollY) {
				setShowAddButton(false)
			} else {
				setShowAddButton(true)
			}
			lastScrollY = window.scrollY
		}
		window.addEventListener("scroll", handleScroll)
		return () => window.removeEventListener("scroll", handleScroll)
	}, [])
	React.useEffect(() => {
		document.body.style.overflow = showAddPopup ? "hidden" : ""
		return () => {document.body.style.overflow = ""}
	}, [showAddPopup])

	const addCurrency = (currency) => {
		if (!selectedCurrencies.some(c => c.iso_code === currency.iso_code)) {
			setSelectedCurrencies(prev => [...prev, {...currency}])
		}
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

	const reorder = (list, startIndex, endIndex) => {
		const result = Array.from(list)
		const [removed] = result.splice(startIndex, 1)
		result.splice(endIndex, 0, removed)
		return result
	}
	const onDragEnd = (result)=>{
		if(!result.destination) { return }
		const itemsnew = reorder(
			selectedCurrencies, 
			result.source.index, 
			result.destination.index
		)
		setSelectedCurrencies(itemsnew)
	}

	return (
		<div className="dark:bg-zinc-900 dark:text-white min-h-dvh transition">
			<div className="p-4 border-b border-zinc-200 dark:border-zinc-700 select-none">
				<header className="flex items-center justify-between gap-3 w-lg max-w-full mx-auto"
					inert={showAddPopup ? "" : undefined}
				>
					<div className="flex items-center gap-3">
						<img className="h-9" src="icon.png" draggable={false} alt="Icon"/>
						<div className="flex flex-col">
							<span className="font-bold uppercase text-lg">Currency Converter</span>
							{ratesTime && (
								<span className="text-xs text-gray-500 flex gap-1">
									<span>Updated at</span>
									<span>{new Date(ratesTime).toLocaleString(undefined, {
											day: "2-digit",
											month: "2-digit",
											year: "2-digit",
											hour: "2-digit",
											minute: "2-digit",
											hour12: false
										})}
									</span>
								</span>
							)}
						</div>
					</div>
					<div className={`h-7 w-7 rounded-lg text-xs
						flex items-center justify-center
						border border-zinc-200 dark:border-zinc-700
						bg-zinc-100 dark:bg-zinc-800
						text-gray-700 dark:text-gray-100 transition
						${loadingApiData ? '' : `cursor-pointer active:scale-95
							hover:bg-zinc-200 active:bg-zinc-200
							dark:hover:bg-zinc-700 dark:active:bg-zinc-700
						`}
						outline-none focus-visible:ring-2
						focus-visible:ring-zinc-300/50
						dark:focus-visible:ring-zinc-700/60
					`}
						role="button"
						tabIndex={0}
						title="Refresh rates"
						aria-label="Refresh exchange rates"
						onClick={() => { loadRates() }} disabled={loadingApiData}
						onPointerDown={()=>navigator.vibrate(30)}
						onKeyDown={(e) => {
							if (e.keyCode == 13 && !loadingApiData){
								loadRates()
							}
						}}
					>
						<i className={`fa-solid fa-arrows-rotate ${loadingApiData ? 'fa-spin' : ''}`}></i>
					</div>
				</header>
			</div>

			<div className={`fixed bottom-5 right-5 h-14 w-14 rounded-full shadow-lg text-xl
				flex items-center justify-center cursor-pointer active:scale-90
				bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-600 z-10
				print:hidden outline-none
				focus-visible:ring-4 focus-visible:ring-sky-400/50
				${showAddButton && currencies.length > 0 ? "translate-y-0" : "translate-y-24"}
			`}
				style={{
					transition: "translate 300ms ease, background-color 150ms ease, scale 150ms ease"
				}}
				inert={showAddPopup || !(showAddButton && currencies.length > 0) ? "" : undefined}
				tabIndex={0}
				role="button"
				title="Add currency"
				aria-label="Add currency"
				onClick={() => setShowAddPopup(true)}
				onPointerDown={()=>navigator.vibrate(30)}
				onKeyDown={(e) => {
					if (e.keyCode == 13){setShowAddPopup(true)}
				}}
			>
				<i className="fa-solid fa-plus"></i>
			</div>
			{showAddPopup && (
				<AddCurrencyPopup
					currencies={currencies}
					selectedCurrencies={selectedCurrencies}
					onClose={() => setShowAddPopup(false)}
					addCurrency={addCurrency}
				/>
			)}

			{(currencies.length > 0) && (rates.length > 0) ? (
				<ReactBeautifulDnd.DragDropContext
					onDragEnd={onDragEnd}
					onDragStart={()=>navigator.vibrate(50)}
					onDragUpdate={()=>navigator.vibrate(25)}
				>
					<ReactBeautifulDnd.Droppable droppableId="droppable">
					{(provided, snapshot) => (
						<main 
							ref={provided.innerRef} 
							className="p-4 flex flex-col gap-3 w-xl max-w-full mx-auto"
							{...provided.droppableProps}
							inert={showAddPopup ? "" : undefined}
						>
						{selectedCurrencies.map((currency, index) => (
							<ReactBeautifulDnd.Draggable
								key={currency.iso_code}
								draggableId={currency.iso_code}
								index={index}
							>
							{(provided, snapshot) => (
								<CurrencyCard
									innerRef={provided.innerRef}
									draggableProps={provided.draggableProps}
									dragHandleProps={provided.dragHandleProps}
									isDragging={snapshot.isDragging}
									currency={currency}
									currentCurrency={currentCurrencyFrom}
									value={convertCurrency(currentAmount, currentCurrencyFrom, currency.iso_code)}
									onAmountChange={handleAmountChange}
									onRemove={() => setSelectedCurrencies(prev => prev.filter(c => c.iso_code !== currency.iso_code))}
								/>
							)}
							</ReactBeautifulDnd.Draggable>
						))}
						{provided.placeholder}
						</main>
					)}
					</ReactBeautifulDnd.Droppable>
				</ReactBeautifulDnd.DragDropContext>
			) : (
				<div className="text-center p-5">
					<i className="fa-solid fa-spinner fa-spin text-3xl"></i>
				</div>
			)}
		</div>
	)
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>)

const CurrencyCard = ({
	innerRef,
	draggableProps,
	dragHandleProps,
	isDragging,
	currency,
	value,
	onRemove,
	onAmountChange,
	currentCurrency,
}) => {
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
	const setCurrentField = () => {
		if (currentCurrency != currency.iso_code){
			onAmountChange(0, currency)
		}
	}

	return (
		<div ref={innerRef}
			className={`
				animate-[modalIn_0.5s_ease_backwards]
				flex items-center gap-4 transition-colors
				border border-zinc-200 dark:border-zinc-700
				rounded-2xl p-4 shadow-sm print:shadow-none
				bg-white/25 dark:bg-zinc-900/25
				backdrop-blur-sm print:break-inside-avoid
				${isDragging ? 'scale-95' : ''}
			`}
			{...draggableProps}
		>
			<div className="text-zinc-500 self-stretch flex items-center p-4 -m-4
				hover:text-zinc-900 dark:hover:text-zinc-300
				active:text-zinc-900 dark:active:text-zinc-300
				!cursor-move touch-none transition
				outline-none rounded-2xl
				focus-visible:ring-2 focus-visible:ring-zinc-400/50
				focus-visible:-mr-2
				focus-visible:text-zinc-900 dark:focus-visible:text-zinc-300
			"
				tabIndex={0}
				role="button"
				aria-label="Drag to reorder"
				{...dragHandleProps}
			>
				<i className="fa-solid fa-grip-vertical"></i>
			</div>
			<div className="flex-1 grid grid-cols-[1fr_auto] gap-2 items-center">
				<div className="flex flex-col select-none whitespace-nowrap">
					<span className="text-lg font-bold">{currency.iso_code}</span>
					<div className="text-sm text-zinc-500">{currency.name}</div>
				</div>
				<div className="h-9 w-9 rounded-xl
					flex items-center justify-center
					bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/20
					text-red-500 active:scale-90
					transition cursor-pointer
					self-start outline-none
					focus-visible:ring-2 focus-visible:ring-red-500/50
				"
					role="button"
					tabIndex={0}
					aria-label={`Remove ${currency.name}`}
					onClick={onRemove}
					onPointerDown={()=>navigator.vibrate(50)}
					onKeyDown={(e) => {
						if (e.keyCode == 13){onRemove()}
					}}
				>
					<i className="fa-solid fa-xmark"></i>
				</div>
				<input className="no-spinner text-2xl font-mono outline-none w-full text-black dark:text-white"
					type="number" inputMode="decimal" min="0" placeholder="0"
					value={localVal || ""}
					onChange={handleChange}
					onClick={setCurrentField}
				/>
				<span className="text-xl font-mono text-zinc-500 justify-self-center select-none">{currency.symbol}</span>
			</div>
		</div>
	)
}

const AddCurrencyPopup = ({
	currencies, selectedCurrencies, onClose, addCurrency
}) => {
	const currencyNames = new Intl.DisplayNames(undefined, {
		type: 'currency'
	})
	const [query, setQuery] = React.useState('')
	const q = query.toLowerCase()
	const filteredCurrencies = currencies
	.filter(currency => {
		const localizedName = currencyNames.of(currency.iso_code)?.toLowerCase() || ''
		return (
			currency.iso_code.toLowerCase().includes(q) ||
			currency.name.toLowerCase().includes(q) ||
			localizedName.includes(q)
		)
	})
	.filter(currency =>
		!selectedCurrencies.some(c => c.iso_code === currency.iso_code)
	)

	return (
		<Popup title="Add Currency" width="w-lg" onClose={onClose}>
			<div className="grid grid-cols-[theme(spacing.9)_1fr] items-center gap-3 p-3">
				<i className="fa-solid fa-magnifying-glass justify-self-center"></i>
				<input className="outline-none text-black dark:text-white" type="search" placeholder="Code or name..."
					value={query} onChange={e => setQuery(e.target.value)}
				/>
			</div>
			{filteredCurrencies.length > 0 && (
				<div className="max-h-96 overflow-y-auto scrollbar-thin dark:scheme-dark outline-none">
					{filteredCurrencies.map((currency, index) => (
						<div key={index} className="
							grid grid-cols-[theme(spacing.9)_1fr] items-center gap-3 p-3 cursor-pointer
							hover:bg-zinc-200 active:bg-zinc-200 transition select-none outline-none
							dark:hover:bg-zinc-700 dark:active:bg-zinc-700
							focus-visible:bg-zinc-200 dark:focus-visible:bg-zinc-700
						"
							role="button"
							tabIndex={0}
							onClick={() => {addCurrency(currency); onClose()}}
							onPointerDown={()=>navigator.vibrate(30)}
							onKeyDown={(e) => {
								if (e.keyCode == 13){
									addCurrency(currency)
									onClose()
								}
							}}
						>
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
	React.useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.keyCode == 27) { onClose() }
		}
		document.addEventListener("keydown", handleKeyDown)
		return () => { document.removeEventListener("keydown", handleKeyDown) }
	}, [onClose])
	return (
		<div className="animate-[fadeIn_0.22s_ease_both] backdrop-blur-xs fixed z-20 inset-0 bg-black/50 flex items-center justify-center"
			onClick={handleClick}
		>
			<div className={`
				animate-[modalIn_0.22s_ease_both]
				bg-white dark:bg-zinc-900 dark:text-white rounded-xl divide-y divide-zinc-200 dark:divide-zinc-700
				border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden
				${width} max-w-[calc(100%-theme(spacing.4))]
			`}>
				<h2 className="p-3 relative text-center select-none">
					<span className="font-bold text-lg">{title}</span>
					<div className="absolute top-1/2 transform -translate-y-1/2 right-3 cursor-pointer
						w-6 h-6 flex items-center justify-center rounded-full text-xs
						text-white bg-red-500 hover:bg-red-700 active:bg-red-700 transition
						active:scale-95 outline-none
						focus-visible:ring-3 focus-visible:ring-red-500/50
					"
						role="button"
						tabIndex={0}
						onClick={onClose}
						onPointerDown={()=>navigator.vibrate(30)}
						onKeyDown={(e) => {
							if (e.keyCode == 13){onClose()}
						}}
					>
						<i className="fa-solid fa-xmark"></i>
					</div>
				</h2>
				{children}
			</div>
		</div>
	)
}
