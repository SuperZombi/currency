const App = () => {
	const [currencies, setCurrencies] = React.useState([])
	const [showAddPopup, setShowAddPopup] = React.useState(false)
	const [selectedCurrencys, setSelectedCurrencys] = React.useState([])

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

		const savedSelectedCurrencys = localStorage.getItem('selectedCurrencys')
		if (savedSelectedCurrencys) {
			setSelectedCurrencys(JSON.parse(savedSelectedCurrencys))
		}
	}, [])
	React.useEffect(() => {
		localStorage.setItem('selectedCurrencys', JSON.stringify(selectedCurrencys))
	}, [selectedCurrencys])

	const addCurrency = (currency) => {
		if (!selectedCurrencys.some(c => c.iso_code === currency.iso_code)) {
			setSelectedCurrencys(prev => [...prev, {...currency}])
		}
	}

	const [draggedIndex, setDraggedIndex] = React.useState(null)
	const [dragOverIndex, setDragOverIndex] = React.useState(null)
	const handleDragStart = (e, index) => {
		setDraggedIndex(index)
		const ghost = document.createElement('div')
		ghost.style.cssText = `
			position: fixed; top: -1000px;
			background: white; border: 2px solid #3b82f6;
			border-radius: 12px; padding: 12px 16px;
			font-family: monospace; font-weight: bold;
			box-shadow: 0 8px 24px rgba(0,0,0,0.15);
			opacity: 0.95; font-size: 1rem;
		`
		ghost.textContent = `${selectedCurrencys[index].iso_code} ${selectedCurrencys[index].symbol}`
		document.body.appendChild(ghost)
		e.dataTransfer.setDragImage(ghost, 0, 0)
		requestAnimationFrame(() => document.body.removeChild(ghost))
	}
	const handleDrop = (targetIndex) => {
		if (draggedIndex === null || draggedIndex === targetIndex) return;
		const updated = [...selectedCurrencys]
		const [draggedItem] = updated.splice(draggedIndex, 1)
		updated.splice(targetIndex, 0, draggedItem)
		setSelectedCurrencys(updated)
		setDraggedIndex(null)
	}

	return (
		<React.Fragment>
			<div className="p-4 flex flex-col gap-2 w-xl max-w-full mx-auto">
				<div className="
					border px-4 py-2
					flex gap-2 items-center justify-center
					cursor-pointer rounded-xl
				" onClick={() => setShowAddPopup(true)}
				>
					<i className="fa-solid fa-plus"></i>
					<span>Add Currency</span>
				</div>

				{selectedCurrencys.map((currency, index) => (
					<div key={`${currency.iso_code}-${index}`} draggable
						onDragStart={(e) => handleDragStart(e, index)}
						onDragEnd={() => setDraggedIndex(null)}
						onDragOver={(e) => {e.preventDefault(); setDragOverIndex(index)}}
						onDrop={() => {handleDrop(index); setDragOverIndex(null)}}
						className={`animate-[fadeIn_0.2s_ease_forwards]
							border p-3 rounded-xl flex items-center gap-3 cursor-move
							${draggedIndex === index ? 'opacity-50 scale-95' : ''}
							${dragOverIndex === index && draggedIndex !== index ? 'border-blue-500' : ''}
						`}
					>
						<i className="fa-solid fa-bars"></i>
						<div className="flex flex-col select-none whitespace-nowrap">
							<span className="font-mono font-bold">{currency.iso_code}</span>
							<span className="text-sm text-gray-500">{currency.name}</span>
						</div>
						<div className="ml-auto flex items-center gap-3">
							<div className="flex items-center gap-1">
								<input className="text-right outline-none w-full"
									type="number" inputMode="decimal" min="0" placeholder="0"
								/>
								<span className="font-semibold font-mono text-xl">{currency.symbol}</span>
							</div>
							<i className="fa-regular fa-circle-xmark cursor-pointer"
								onClick={() => setSelectedCurrencys(prev => prev.filter(c => c.iso_code !== currency.iso_code))}
							></i>
						</div>
					</div>
				))}
			</div>


			{showAddPopup && (
				<AddCurrencyPopup
					currencies={currencies}
					selectedCurrencys={selectedCurrencys}
					onClose={() => setShowAddPopup(false)}
					addCurrency={addCurrency}
				/>
			)}
		</React.Fragment>
	)
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>)

const AddCurrencyPopup = ({
	currencies, selectedCurrencys, onClose, addCurrency
}) => {
	const [query, setQuery] = React.useState('')
	const filteredCurrencies = currencies.filter(currency =>
		currency.iso_code.toLowerCase().includes(query.toLowerCase()) || currency.name.toLowerCase().includes(query.toLowerCase())
	).filter(currency => !selectedCurrencys.some(c => c.iso_code === currency.iso_code))

	return (
		<Popup title="Add Currency" width="w-96" onClose={onClose}>
			<div className="grid grid-cols-[theme(spacing.9)_1fr] items-center gap-3 p-3">
				<i className="fa-solid fa-magnifying-glass justify-self-center"></i>
				<input className="outline-none" type="search" placeholder="Code or name..."
					value={query} onChange={e => setQuery(e.target.value)}
				/>
			</div>
			<div className="max-h-96 overflow-y-auto scrollbar-thin">
				{filteredCurrencies.map((currency, index) => (
					<div key={index} className="
						grid grid-cols-[theme(spacing.9)_1fr] items-center gap-3 p-3 cursor-pointer
						hover:bg-gray-100 transition select-none
					" onClick={() => {addCurrency(currency); onClose()}}>
						<span className="justify-self-center font-mono font-semibold">{currency.iso_code}</span>
						<span>{currency.name}</span>
					</div>
				))}
			</div>
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
		<div className="animate-[fadeIn_0.22s_ease_forwards] fixed inset-0 bg-black/50 flex items-center justify-center" onClick={handleClick}>
			<div className={`
				animate-[modalIn_0.22s_ease_forwards]
				bg-white rounded-xl divide-y overflow-hidden
				${width} max-w-[calc(100%-theme(spacing.4))]
			`}>
				<h2 className="font-bold p-3 relative text-center select-none">
					<span>{title}</span>
					<div className="absolute top-1/2 transform -translate-y-1/2 right-3 cursor-pointer"
						onClick={onClose}
					>
						<i className="fa-solid fa-circle-xmark text-red-500 text-xl"></i>
					</div>
				</h2>
				{children}
			</div>
		</div>
	)
}
