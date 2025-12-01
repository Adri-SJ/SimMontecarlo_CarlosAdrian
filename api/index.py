from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
import os

# Importar la lógica de simulación
from .logica_Montecarlo import ejec_sim_mc

# Configuración de FastAPI
app = FastAPI(title="Simulador Riesgo MC")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permitir todos los orígenes por simplicidad, puedes restringirlo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Modelo de datos para la simulación de Montecarlo
class ParamsSimMC(BaseModel): # Parámetros Simulación Montecarlo
    prc_actual: float = Field(..., gt=0)
    volat: float = Field(..., gt=0)
    num_dias: int = Field(..., gt=0)
    num_sims: int = Field(..., gt=0, le=5000)

# --- ENDPOINTS ---

@app.get("/")
def estado_api():
    return {"msg": "API de Simulación MC Activa"}

# Renombramos el endpoint principal
@app.post("/api/simulate") # <-- Nueva ruta
def simular_riesgo(datos_entrada: ParamsSimMC):
    """
    Ejecuta la simulación de Montecarlo.
    """
    try:
        resultados = ejec_sim_mc( # Usamos la nueva función
            datos_entrada.prc_actual,
            datos_entrada.volat,
            datos_entrada.num_dias,
            datos_entrada.num_sims
        )
        return resultados
    except Exception as e:
        print(f"Error en Simulación MC: {e}") 
        raise HTTPException(status_code=500, detail=f"Error en simulación: {str(e)}")