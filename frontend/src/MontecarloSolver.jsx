import React, { useState, useMemo } from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { FaChartLine, FaFlask, FaDollarSign, FaCalculator } from 'react-icons/fa';
import './Montecarlo.css'; 

// Ruta al endpoint modificado en Python
const API_URL = '/api/simulate'; 

const MontecarloSolver = () => {
    
    // 1. ESTADO
    const [input, setInput] = useState({
        current_price: 100,
        volatility: 0.2, 
        num_days: 252,   
        num_simulations: 1000,
    });
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Función robusta para manejar cambios en inputs type="text"
    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Paso 1: Reemplazar comas por puntos (compatibilidad regional)
        const sanitizedValue = value.replace(',', '.');
        
        // Paso 2: Convertir a float. Si la cadena está vacía (""), se usa 0
        const parsedValue = sanitizedValue === "" ? 0 : parseFloat(sanitizedValue);

        // Paso 3: Actualizar el estado con el valor numérico limpio
        setInput(prev => ({
            ...prev,
            [name]: parsedValue
        }));
    };

    // 2. MANEJO DE LA API
    const handleSimulate = async () => {
        setIsLoading(true);
        setResults(null);
        setError(null);
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Enviamos datos usando las claves que espera el modelo ParamsSimMC del Backend
                body: JSON.stringify({
                    prc_actual: input.current_price,
                    volat: input.volatility,
                    num_dias: input.num_days,
                    num_sims: input.num_simulations,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setResults(data);
            
        } catch (err) {
            console.error("Fallo en la simulación:", err);
            setError(err.message || "Error al conectar con la API de simulación.");
        } finally {
            setIsLoading(false);
        }
    };
    
    // 3. FORMATEO DE DATOS
    const chartData = useMemo(() => {
        if (!results || !results.ruta_prom) {
            return [];
        }
        
        const numSteps = results.ruta_prom.length; 
        
        let data = Array.from({ length: numSteps }, (_, i) => ({ day: i }));
        
        for (let i = 0; i < numSteps; i++) { 
            // Usamos la conversión a Number() para seguridad, aunque ya se hizo en Python
            data[i].avg = Number(results.ruta_prom[i]);
            data[i].p5 = Number(results.ruta_p5[i]);
            data[i].p95 = Number(results.ruta_p95[i]);
        }

        results.simulaciones.forEach((path, index) => {
            path.forEach((price, stepIndex) => { 
                data[stepIndex][`sim${index}`] = Number(price);
            });
        });
        
        return data;
    }, [results]);

    // 4. RENDERIZADO
    return (
        <div className="solver-container montecarlo-container">
            <h1><FaChartLine /> Simulación de Riesgo Montecarlo</h1>

            <div className="main-layout">
                <div className="control-panel">
                    <h3><FaFlask /> Parámetros de Simulación</h3>
                    
                    {/* CRÍTICO: Usamos <form noValidate> para anular la validación HTML5 */}
                    <form onSubmit={(e) => { 
                        e.preventDefault(); 
                        handleSimulate(); 
                    }} noValidate> 
                        <div className="input-grid">
                            <label>Precio Actual (S0):</label>
                            <input type="text" name="current_price" value={input.current_price} onChange={handleChange} disabled={isLoading} />
                            
                            <label>Volatilidad (σ):</label>
                            <input type="text" name="volatility" value={input.volatility} onChange={handleChange} disabled={isLoading} />
                            
                            <label>Días a Proyectar (T):</label>
                            <input type="text" name="num_days" value={input.num_days} onChange={handleChange} disabled={isLoading} />
                            
                            <label>N° Simulaciones (N):</label>
                            <input type="text" name="num_simulations" value={input.num_simulations} onChange={handleChange} disabled={isLoading} />
                        </div>

                        <button type="submit" disabled={isLoading} style={{ width: '100%', marginTop: '20px' }}>
                            {isLoading ? 'Calculando Caminos...' : 'Ejecutar Simulación'}
                        </button>
                    </form>
                    
                    {error && <p className="error-message">{error}</p>}
                    
                    {/* --- Tarjeta de VaR (Value at Risk) --- */}
                    {results && (
                        <div className="var-card">
                            <h3><FaCalculator /> Value at Risk (VaR 95%)</h3>
                            <p className="var-metric">
                                <FaDollarSign /> Pérdida Máxima Estimada:
                                <strong> ${results.Perdida_VaR.toFixed(2)}</strong>
                            </p>
                            <p className="var-detail">
                                * 5% de probabilidad de caer por debajo de 
                                **${results.Prc_VaR_P5.toFixed(2)}**.
                            </p>
                        </div>
                    )}
                </div>

                {/* --- Área de Visualización (Gráfica) --- */}
                <div className="visualization-area">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={450}>
                            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                                <XAxis dataKey="day" label={{ value: 'Días Proyectados', position: 'bottom' }} />
                                <YAxis domain={['auto', 'auto']} label={{ value: 'Precio del Activo ($)', angle: -90, position: 'left' }} />
                                <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Precio']} />
                                <Legend verticalAlign="top" height={36}/>
                                
                                {/* 1. Caminos "Espagueti" */}
                                {results.simulaciones.map((_, index) => (
                                    <Line 
                                        key={`sim-${index}`}
                                        type="monotone" 
                                        dataKey={`sim${index}`} 
                                        stroke="#808080" 
                                        strokeWidth={0.5} 
                                        strokeOpacity={0.05} 
                                        dot={false} 
                                        isAnimationActive={false}
                                        legendType="none"
                                    />
                                ))}

                                {/* 2. Percentiles y Promedio */}
                                <Line type="monotone" dataKey="p95" stroke="#4CAF50" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="Percentil 95%" />
                                <Line type="monotone" dataKey="avg" stroke="#3498db" strokeWidth={3} dot={false} name="Precio Promedio" />
                                <Line type="monotone" dataKey="p5" stroke="#E74C3C" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="Percentil 5% (VaR)" />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="chart-placeholder">
                            <p>Ingresa los parámetros y ejecuta la simulación para visualizar los caminos de riesgo.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MontecarloSolver;