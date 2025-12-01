import numpy as np
from typing import Dict, Any, List

# Renombramos la función principal
def ejec_sim_mc(
    Prc_Act: float, # Precio Actual (S0)
    Vol: float,     # Volatilidad (sigma)
    Num_Dias: int,  # Días a proyectar (T)
    Num_Sims: int,  # Número de simulaciones (N)
    Ret_Esp: float = 0.0001 # Retorno Esperado (mu)
) -> Dict[str, Any]:
    """
    Ejecuta la Simulación de Montecarlo (Movimiento Browniano Geométrico).
    """
    
    dT = 1.0  # Paso de tiempo
    
    Desp = (Ret_Esp - 0.5 * Vol**2) * dT
    Aleat = np.random.standard_normal((Num_Sims, Num_Dias))
    Ret_Dias = np.exp(Desp + Vol * np.sqrt(dT) * Aleat)
    
    Rutas_Prc = np.zeros((Num_Sims, Num_Dias + 1))
    Rutas_Prc[:, 0] = Prc_Act 
    
    for t in range(1, Num_Dias + 1):
        Rutas_Prc[:, t] = Rutas_Prc[:, t-1] * Ret_Dias[:, t-1]    
    
    Ruta_Prom = np.mean(Rutas_Prc, axis=0).tolist()
    
    Ruta_P5 = np.percentile(Rutas_Prc, 5, axis=0).tolist()
    Ruta_P95 = np.percentile(Rutas_Prc, 95, axis=0).tolist()
    Prc_Finales = Rutas_Prc[:, -1]
    Prc_VaR_5 = np.percentile(Prc_Finales, 5)
    
    Perd_VaR = Prc_Act - Prc_VaR_5 
    Sims_Front = Rutas_Prc[::(Num_Sims // 100) or 1].tolist()
    
    return {
        "Prc_Ini": Prc_Act,
        "N_Sims": Num_Sims,
        "T_Dias": Num_Dias,
        "simulaciones": Sims_Front, 
        "ruta_prom": Ruta_Prom,           
        "ruta_p5": Ruta_P5, 
        "ruta_p95": Ruta_P95, 
        "Perdida_VaR": round(Perd_VaR, 2), # VaR Pérdida
        "Prc_VaR_P5": round(Prc_VaR_5, 2)   # Precio al 5%
    }