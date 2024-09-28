// middleware/pagination.js

// Função pra fazer a paginação
// model: array de dados
// page: qual pagina mostrar começa em 1
// limit: quantos itens por pagina padrão 5
const pagination = (model, page = 1, limit = 5) => {
    
    // Calcula onde começa a página
    const startAt = (page - 1) * limit;
    
    // Pega só os itens dessa página
    const paginatedData = model.slice(startAt, startAt + limit);

    // Retorna os dados paginados e info da página
    return {
        data: paginatedData,
        currentPage: page,
        totalPages: Math.ceil(model.length / limit), // Calcula o total de páginas
    };
};

// Exporta a função pra usar em outros arquivos
module.exports = pagination;
