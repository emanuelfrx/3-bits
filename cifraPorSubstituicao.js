export function cifraPorSubstituicao(texto) {
    // Mapa de substituição para letras e números
    const mapaSubstituicao = {
        'a': 'x', 'b': 'y', 'c': 'z', 'd': 'w', 'e': 'v',
        'f': 'u', 'g': 't', 'h': 's', 'i': 'r', 'j': 'q',
        'k': 'p', 'l': 'o', 'm': 'n', 'n': 'm', 'o': 'l',
        'p': 'k', 'q': 'j', 'r': 'i', 's': 'h', 't': 'g',
        'u': 'f', 'v': 'e', 'w': 'd', 'x': 'c', 'y': 'b',
        'z': 'a', '0': '9', '1': '8', '2': '7', '3': '6',
        '4': '5', '5': '4', '6': '3', '7': '2', '8': '1',
        '9': '0', 'A': 'X', 'B': 'Y', 'C': 'Z', 'D': 'W',
        'E': 'V', 'F': 'U', 'G': 'T', 'H': 'S', 'I': 'R',
        'J': 'Q', 'K': 'P', 'L': 'O', 'M': 'N', 'N': 'M',
        'O': 'L', 'P': 'K', 'Q': 'J', 'R': 'I', 'S': 'H',
        'T': 'G', 'U': 'F', 'V': 'E', 'W': 'D', 'X': 'C',
        'Y': 'B', 'Z': 'A', 'ç': 'Ç', 'Ç': 'ç', 'á': 'Á',
        'Á': 'á', 'é': 'É', 'É': 'é', 'í': 'Í', 'Í': 'í',
        'ó': 'Ó', 'Ó': 'ó', 'ú': 'Ú', 'Ú': 'ú', 'ã': 'Ã',
        'Ã': 'ã', 'õ': 'Õ', 'Õ': 'õ'
    };

    let resultado = ''; // Onde guardamos o texto cifrado

    // Percorre cada caractere do texto
    for (let i = 0; i < texto.length; i++) {
        let char = texto[i];
        // Se o caractere estiver no mapa, substitui, se não, mantém o mesmo caractere
        resultado += mapaSubstituicao[char] || char;
    }

    return resultado; // Retorna o texto cifrado
}