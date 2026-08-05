# Skill: Public APIs

## Description
Catálogo colectivo de APIs públicas y gratuitas para usar en desarrollo de software. Más de 1400 APIs categorizadas por tema (animales, finanzas, clima, música, gobierno, etc.). Referencia para integrar servicios externos sin costo.

## Activation
Cuando se necesite integrar una API externa gratuita, buscar servicios disponibles para una funcionalidad específica, o agregar datos en tiempo real a la aplicación.

## Instructions

### Rol
Base de conocimiento de APIs públicas gratuitas. Cuando el usuario necesite datos externos (clima, monedas, noticias, geolocalización, etc.), consultar este catálogo para encontrar la API adecuada.

### Categorías disponibles

| Categoría | Ejemplos de APIs |
|-----------|-----------------|
| Animales | Dog API, Cat Facts, RandomFox |
| Finanzas | ExchangeRate-API, CoinGecko, Open Exchange Rates |
| Clima | OpenWeatherMap, WeatherAPI, Open-Meteo |
| Geolocalización | IP-API, ipstack, OpenCage |
| Noticias | NewsAPI, GNews, Currents API |
| Música | Spotify Web API, Last.fm, Deezer |
| Gobierno | datos.gob.cl, USAspending, EU Open Data |
| Desarrollo | GitHub API, GitLab API, Bitbucket |
| Machine Learning | Hugging Face, Replicate, Clarifai |
| Traducción | LibreTranslate, MyMemory, DeepL Free |
| Imágenes | Unsplash, Pexels, Lorem Picsum |
| Autenticación | Auth0, Firebase Auth, Supabase Auth |

### Criterios de selección

Al recomendar una API, priorizar:
1. **Gratuita** (free tier generoso o totalmente gratis)
2. **Sin API key** si es posible (o registro simple)
3. **CORS habilitado** (para uso desde browser/frontend)
4. **Documentación clara** en español o inglés
5. **Estable** (uptime alto, mantenida activamente)
6. **Rate limits razonables** para uso en producción

### Formato de recomendación

```markdown
### [Nombre de la API]
- **URL**: https://...
- **Auth**: Ninguna / API Key gratuita / OAuth
- **CORS**: Sí / No
- **Rate limit**: X requests/minuto
- **Ideal para**: [caso de uso específico]
- **Ejemplo**: `GET https://api.ejemplo.com/endpoint`
```

### Integración con Sistema Ómicron

APIs útiles para Ómicron:
- **Geolocalización** (EmpleosTab → radar de empleos por ubicación)
- **Monedas/Exchange** (WalletTab → conversión de tokens a moneda local)
- **Verificación de identidad** (Auth → verificar humanidad)
- **Noticias de industria** (VaultTab → contenido relevante por sector)

### Referencia

- Repositorio: https://github.com/public-apis/public-apis
- Lista completa: https://github.com/public-apis/public-apis/blob/master/README.md
- Licencia: MIT

## Example

**Input:** "Necesito una API gratuita para obtener el tipo de cambio USD/CLP en tiempo real"

**Output:**
### ExchangeRate-API
- **URL**: https://open.er-api.com/v6/latest/USD
- **Auth**: Ninguna (tier gratuito sin key)
- **CORS**: Sí
- **Rate limit**: 1500 requests/mes gratis
- **Ideal para**: Conversión de monedas en WalletTab
- **Ejemplo**: `GET https://open.er-api.com/v6/latest/USD` → devuelve rates.CLP
