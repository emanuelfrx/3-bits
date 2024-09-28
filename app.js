
/*aqui eu estou chamando o express que basicamente é um framework responsavel por fazer requisições 
e integrar meus dados com o front end. "Quero pegar um dado do banco de dados" graças ao express*/
const express = require("express");
const multer = require('multer');

//Middelware para gerenciar sessões no express, afinal só posso mexer nessa bagaça se estiver autenticado
const session = require("express-session");
//modulo do node que permite manipular caminhos de diretórios
const path = require("path");

/*chamando um arquivo que contem as configurações basicas do firebaser para realizar autenticação, como por exemplo 
link para chave de acesso
*/
const admin = require("./firebase-config"); 
const paginate = require('./middleware/pagination'); // Ajuste o caminho se necessário


//importando metodos do firestore que serão responsáveis por coletar, cadastrar, editar e excluir dados do firebase veyr
const {
    getFirestore,
    getClientFirestore,
    collection,
    getDocs,
    addDoc,
    doc,
    deleteDoc,
    banco,
    auth,
    updateDoc,
    getDoc,
} = require("./firebase");
const app = express();
const { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } = require('firebase/auth');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const storage = getStorage(); // Inicializa o Firebase Storage
const { getAuth } = require('firebase-admin/auth'); // Importar Firebase Auth


/*Iniciando minha aplicação no firebase. criando o cerebro da aplicação, pelo app eu consigo definir o fluxo de rotas, requisições
por isso que tu usa direto app.get app.post. Get eu estou pegando uma requisição do meu sistema e post eu estou enviando um requisição!
*/

//pegando meu banco de dados, não preciso dizer mais nada 

//confirmando que eu criei um banco e ele funciona, gostou?
console.log("meu banco é esse: ", banco);

/**
 * Um middleware de sessão é uma função intermediária em um servidor web que permite armazenar 
 * e gerenciar informações relacionadas ao estado de uma sessão de usuário entre diferentes 
 * requisições HTTP.(chat gpt)
 */
app.use(
    session({
        secret: "esse segredo eu nao conto pra ninguem",
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // Mudar para true se estiver usando HTTPS
    }),
);
//configura um motor para usar o pug, que é uma linguagem de template que NA TEORIA facilita
app.set("view engine", "pug");

//depois de chamar o pug eu vou mostrar onde estão esses arquivos que é na pasta views
app.set("views", path.join(__dirname, "views"));

//chamando o express para servir arquivos estaticos, ou seja fotos, css e demais coisas
app.use(express.static(path.join(__dirname, "public")));

app.use(express.json()); // Para JSON

//esse aqui é pra interpretar os dados via post, ou seja quando eu estiver enviando dados
app.use(express.urlencoded({ extended: true }));

/**depois de terminar a configuração do servido vamos usar app para poder encaminhar o comportamento do usuario */


//Essa é a rota rais que é no caso login
app.get("/", (req, res) => {
    res.redirect("login");
});
// rederizando a pagina login
// Rota de login
app.get('/login', (req, res) => {
  res.render('login', { user: req.session.id });
  
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Armazenar o usuário como um objeto na sessão
      req.session.user = {
          email: user.email,
          displayName: user.displayName || "Usuario"
      };
      console.log("Usuário logado:", req.session.user);
      res.redirect('/home'); // Redirecionamento para a página home

  } catch (error) {
      console.error("Erro de login:", error); // Log do erro

      // Mensagem de erro específica
      let errorMessage;
      if (error.code === 'auth/wrong-password') {
          errorMessage = 'Senha incorreta. Tente novamente.';
      } else if (error.code === 'auth/user-not-found') {
          errorMessage = 'Usuário não encontrado. Verifique seu email.';
      } else {
          errorMessage = 'Erro ao fazer login. Tente novamente.';
      }

      // Renderiza a página de login com a mensagem de erro
      res.render('login', { error: errorMessage });
  }
});


// Middleware para verificar se o usuário está autenticado
function verificarAutenticacao(req, res, next) {
  if (req.session.user) {
      next(); // Usuário autenticado, prossegue
  } else {
      res.redirect("/login"); // Redireciona para login se não autenticado
  }
}

app.get('/home', verificarAutenticacao, async (req, res) => {

  const user = req.session.user; // O usuário é um objeto
  console.log('Email do usuário:', user.email); // Acessando a propriedade email

  // Verifique se o e-mail é válido
  if (!user || typeof user !== 'object' || !user.email) {
      return res.status(400).send('E-mail inválido');
  }

  const nome = user.email.split('@')[0]; // Extrai o nome até o '@'

  try {
      const colecao = await getDocs(collection(banco, 'produtos'))
      const produtos = colecao.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(), // Retorna um objeto que contém todos os dados do documento
      }));
      const page = parseInt(req.query.page) || 1; // Obtém o número da página
     const { data: paginatedProducts, currentPage, totalPages } = paginate(produtos, page);

      const authToken = req.session.authToken || null;

      // Renderiza a página com o nome, produtos e authToken
      res.render("home", { nome, produtos: paginatedProducts, authToken, currentPage, totalPages });
    } catch (error) {
      console.error("Não foi possível pegar produtos:", error);
      res.status(500).send("Erro ao obter produtos");
  }
});

// Rota de produtos protegida
// Aqui é a rota GET pra "/produtos"; só quem tá logado pode entrar
app.get("/produtos", verificarAutenticacao, async (req, res) => {
    try {
        // Pega todos os produtos do Firestore
        const colecao = await getDocs(collection(banco, 'produtos'));

        // Organiza os produtos num array com ID e dados
        const produtos = colecao.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        // Pega o número da página se não tiver, vai pra página 1
        const page = parseInt(req.query.page) || 1;

        // Faz a paginção dos produtos e pega as informações da página
        const { data: paginatedProducts, currentPage, totalPages } = paginate(produtos, page);
        
        // Pega o token de autenticação da sessão, se tiver
        const authToken = req.session.authToken || null;

        // Se o carrinho não existir ainda, cria um vazio
        if (!req.session.carrinho) {
            req.session.carrinho = [];
        }

        // Conta quantos de cada produto estão no carrinho
        const quantidadesNoCarrinho = {};
        req.session.carrinho.forEach(item => {
            // Se já tiver no carrinho, soma a quantidade
            if (quantidadesNoCarrinho[item.id]) {
                quantidadesNoCarrinho[item.id] += item.quantidade;
            } else {
                // Se não, inicializa a quantidade
                quantidadesNoCarrinho[item.id] = item.quantidade;
            }
        });

        // Renderiza a página 
        res.render("produtos", {
            user: req.session.user, // Dados do usuário logado
            produtos: paginatedProducts, // Os produtos que vão aparecer
            authToken, // Token de autenticação
            currentPage, // Página que tá sendo mostrada
            totalPages, // Total de páginas
            quantidadesNoCarrinho // Quantidades no carrinho
        });
    } catch (error) {
        console.error("Erro ao obter produtos:", error);
        // Retorna um erro 500 pra galera
        res.status(500).send("Erro ao obter produtos");
    }
});



// Encerrando minha sessão
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

const upload = multer({ storage: multer.memoryStorage() }); 
//O Multer é um middleware para o Node.js que facilita o upload de arquivos.
// Aqui,  configura o multer pra armazenar o arquivo na memória temporariamente

// Rota pro cadastro
app.get('/cadastro', verificarAutenticacao, async (req, res) => {
    try {
        // Pega todos os produtos do Firestore
        const colecao = await getDocs(collection(banco, 'produtos'));
        
        // Organiza os produtos em um array com ID e dados
        const produtos = colecao.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        
        // Pega o numero da pagina da query; se não tiver, vai pra pagina 1
        const page = parseInt(req.query.page) || 1;

        // Faz a paginção dos produtos e pega as informações da pagina
        const { data: paginatedProducts, currentPage, totalPages } = paginate(produtos, page);
        
        // Renderiza a pagina de cadastro com os produtos e informações de pagincao
        res.render('cadastro', { produtos, paginatedProducts, currentPage, totalPages });
    } catch (error) {
        console.error('Erro ao obter produtos:', error);
        // Retona um erro 500 se não conseguir carregar a pqgina
        res.status(500).send('Erro ao carregar a página de cadastro.');
    }
});

// Rta pra processar o envio do formulqrio de cadastro com imagem
app.post('/cadastro', verificarAutenticacao, upload.single('image'), async (req, res) => {
    //pega os dados do corpo da requisição
    const { nome, preco, descricao, quantidade, id } = req.body; // Aqui pega as informações do produto
    const file = req.file; // Aqui, pega a imaem enviada

    try {
        let downloadURL = null; // Inicializa a URL do download da imagem como nul

        // Checa se uma nova imagem foi enviada
        if (file) {
            const storageRef = ref(storage, `produtos/${file.originalname}`); // Cria referência para o armazenamento da imagem
            const snapshot = await uploadBytes(storageRef, file.buffer); // Faz o upload da imagem
            downloadURL = await getDownloadURL(snapshot.ref); // Obtem a URL da imagem que foi enviada
        }

        if (id) {
            // Se tem um ID, significa que estamos atualizando um produto existente
            const produtoRef = doc(banco, 'produtos', id); // Pega a referência do produto no banco
            await updateDoc(produtoRef, {
                nome: nome, // Atualiza o nome
                preco: parseFloat(preco), // Atualiza o prexo
                descricao: descricao, // Atualiza a descricão
                quantidade: parseInt(quantidade), // Atualiza a quantidade
                image: downloadURL || null, // Atualiza as URL da imagem, se existir
            });

            // Cria um objeto do produto atualizado
            const produtoAtualizado = {
                id,
                nome,
                preco: parseFloat(preco),
                descricao,
                quantidade: parseInt(quantidade),
                image: downloadURL || null,
            };
            res.status(200).json(produtoAtualizado); //Retorna o produto atualizado no formato JSON
        } else {
            // Se não tem ID, estamos criando um novo produto
            const docRef = await addDoc(collection(banco, 'produtos'), {
                nome: nome, // Salva o nome
                preco: parseFloat(preco), // Salva o preço
                descricao: descricao, // Salva a descrição
                quantidade: parseInt(quantidade), // Salva a quantidade
                image: downloadURL, // Salva a URL da imagem, se existir
            });
            
            // Cria um objeto do novo produto
            const novoProduto = {
                id: docRef.id, // Pega o ID do novo poduto
                nome,
                preco: parseFloat(preco),
                descricao,
                quantidade: parseInt(quantidade),
                image: downloadURL || null,
            };

            res.status(201).json(novoProduto); // Retorna o novo produto em formato JSON
        }
    } catch (e) {
        console.error('Erro ao adicionar/atualizar documento: ', e);
        res.status(500).send('Erro ao adicionar ou atualizar produto');
    }
});

//Rota de editar um produto
app.get('/editar/:id', verificarAutenticacao, async (req, res) => {
    const id = req.params.id; // Pega o ID do produto que da URL

    try {
        const docRef = doc(banco, 'produtos', id); // Faz uma referência ao produto no banco
        const docSnap = await getDoc(docRef); // Tenta buscar o documento do produto

        if (docSnap.exists()) { // Se o produto foi encontrado
            const produto = { id: docSnap.id, ...docSnap.data() }; // Cria um obj com os dados do produto

            // pegado todos os produtos cadastrados
            const produtosSnapshot = await getDocs(collection(banco, 'produtos')); 
            const produtos = produtosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); // Monta uma lista de produtos

            // Renderiza a página de cadastro com o produto que vai ser editado e todos os produtos
            res.render('cadastro', { produto, produtos, isEdit: true }); // 'isEdit' é pra dizer que tá editando
        } else {
            res.status(404).send('Produto não encontrado'); // ae não achar o produto, retorna 404
        }
    } catch (error) {
        console.error('Erro ao buscar produto:', error); // Loga o erro se der ruim
        res.status(500).send('Erro ao buscar produto'); // retorna um erro 500 se algo der errado
    }
});

  

//ota pra processar a edição de um produto que ja existe
app.post('/editar', verificarAutenticacao, upload.single('image'), async (req, res) => {
    const { nome, preco, descricao, quantidade, id } = req.body; // pega os dados do produto do corpo da requisição
    const file = req.file; //arquivo de imagem que foi enviado

    try {
        let downloadURL = null; //inicializa a URL do download como nula

        // se tiver um arquivo
        if (file) {
            const storageRef = ref(storage, `produtos/${file.originalname}`); // referência pro local onde vai armazenar a imagem
            const snapshot = await uploadBytes(storageRef, file.buffer); ///Faz o upload da imagem
            downloadURL = await getDownloadURL(snapshot.ref); // pega a URL da imagem que foi feita o upload
        }

        // Atualiza o produto no banco usando o ID
        const produtoRef = doc(banco, 'produtos', id); 
        await updateDoc(produtoRef, {
            nome: nome, //atualiza o nome do produto
            preco: parseFloat(preco), //Converte o preço pra float e atualiza
            descricao: descricao, // atualiza a descrição
            quantidade: parseInt(quantidade), // Converte a quantidade pra int e atualiza
            image: downloadURL || null, ///atualiza a URL da imagem, se existir
        });
        
        // Monta o objeto do produto atualizado
        const produtoAtualizado = {
            id, // ID do produto
            nome, //nome atualizado
            preco: parseFloat(preco), //preço atualizado
            descricao, // descrição atualizada
            quantidade: parseInt(quantidade), // quantidade atualizada
            image: downloadURL || null, // URL da imagem atualizada
        };
        res.status(200).json(produtoAtualizado); // retorna o produto atualizado em formato JSON
    } catch (e) {
        console.error('Erro ao atualizar documento: ', e); // loga o erro se der ruim
        res.status(500).send('Erro ao atualizar produto'); // letorna um erro 500 se algo der errado
    }
});


// rota pra excluir um produto
app.post('/excluir/:id', verificarAutenticacao, async (req, res) => {
    const id = req.params.id;  // pega o ID do produto da URL
    console.log('ID do produto para exclusão:', id);  // loga o ID que vai ser excluído
  
    const idProduto = doc(banco, 'produtos', id);  // cria uma referência pro documento do produto
  
    try {
        // verifica se o produto existe
        const produtoDoc = await getDoc(idProduto);  // tenta pegar o documento do produto
        if (!produtoDoc.exists()) {  // se o produto não existe
            return res.status(404).send('Produto não encontrado');  // manda um erro 404
        }
  
        // exclui o documento
        await deleteDoc(idProduto);  // se o produto existe, exclui ele
        console.log('Produto excluído com sucesso');  // loga que foi excluído
        res.redirect('/produtos');  // redireciona pra lista de produtos
    } catch (error) {
        console.error('Erro ao excluir produto:', error);  // loga erro caso algo dê errado
        res.status(500).send('Erro ao excluir produto');  // manda um erro 500
    }
  });

  //mesma coisa só que é para exluir da tabela de produtos
app.post('/excluir-row/:id', verificarAutenticacao, async (req, res) => {
    const id = req.params.id;
    console.log('ID do produto para exclusão:', id);
  
    const idProduto = doc(banco, 'produtos', id);
  
    try {
        // Verifica se o produto existe
        const produtoDoc = await getDoc(idProduto);
        if (!produtoDoc.exists()) {
            return res.status(404).send('Produto não encontrado');
        }
        
  
        // Exclui o documento
        await deleteDoc(idProduto);
        console.log('Produto excluído com sucesso');
        res.redirect('/cadastro');
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).send('Erro ao excluir produto');
    }
  });


  // Rota para renderizar o formulário de cadastro de usuário
app.get('/cadastrar-usuario', (req, res) => {
    res.render('cadastrar-usuario', { title: 'Cadastrar Usuário' }); // Certifique-se de que o nome do arquivo Pug é correto
});


app.post('/cadastrar-usuario', async (req, res) => {
    const { email, senha } = req.body;
  
    try {
      const userRecord = await createUserWithEmailAndPassword(auth, email, senha);
      res.status(201).json({ uid: userRecord.user.uid, email: userRecord.user.email });
    } catch (error) {
      console.error('Erro ao cadastrar usuário: ', error);
      res.status(400).send('Erro ao cadastrar usuário');
    }
  });

  

// Rota para renderizar a página do carrinho
app.get('/meu-carrinho', verificarAutenticacao, async (req, res) => {
    const carrinho = req.session.carrinho || []; // Obtém o carrinho da sessão
    res.render('meu-carrinho', { carrinho });
});
app.post('/adicionar-ao-carrinho/:id', async (req, res) => {
    const produtoId = req.params.id;
    const quantidade = parseInt(req.body.quantidade); // Obtém a quantidade do corpo da requisição

    // Recupera o produto do Firestore
    const produtoDoc = await getDoc(doc(banco, 'produtos', produtoId));
    const produto = { id: produtoDoc.id, ...produtoDoc.data() };

    // Inicializa o carrinho na sessão se não existir
    if (!req.session.carrinho) {
        req.session.carrinho = [];
    }

    // Verifica se o produto já está no carrinho
    const index = req.session.carrinho.findIndex(item => item.id === produto.id);
    const quantidadeNoCarrinho = index > -1 ? req.session.carrinho[index].quantidade : 0;

    // Verifica se a nova quantidade desejada excede a quantidade disponível no estoque
    if (quantidade + quantidadeNoCarrinho > produto.quantidade) {
        return res.status(400).send('Quantidade solicitada excede a quantidade disponível.');
    }

    if (index > -1) {
        // Se o produto já estiver no carrinho, atualiza a quantidade
        req.session.carrinho[index].quantidade += quantidade;
    } else {
        // Caso contrário, adiciona o novo produto
        produto.quantidade = quantidade; // Define a quantidade
        req.session.carrinho.push(produto);
    }

    res.redirect('/produtos'); // Redireciona para a página de produtos
});

// Rota para remover um produto do carrinho
app.post('/remover-do-carrinho/:id', (req, res) => {
    const produtoId = req.params.id;

    // Inicializa o carrinho na sessão se não existir
    if (!req.session.carrinho) {
        req.session.carrinho = [];
    }

    // Encontra o produto no carrinho
    const index = req.session.carrinho.findIndex(item => item.id === produtoId);
    if (index > -1) {
        const quantidadeRemovida = req.session.carrinho[index].quantidade;

        // Remove o produto do carrinho
        req.session.carrinho.splice(index, 1);

        console.log(`Produto ${produtoId} removido do carrinho. Quantidade devolvida ao estoque: ${quantidadeRemovida}`);

        res.redirect('/meu-carrinho'); // Redireciona para a página do carrinho
    } else {
        res.status(404).send('Produto não encontrado no carrinho.');
    }
});
//essa parte ja é em relação a compra de um produto
app.post('/atualizar-quantidade/:id', async (req, res) => {
    const produtoId = req.params.id;
    const novaQuantidade = parseInt(req.body.quantidade);

    //recupera o produto do Firestore
    const produtoDoc = await getDoc(doc(banco, 'produtos', produtoId));
    const produto = { id: produtoDoc.id, ...produtoDoc.data() };

    //verifica se a nova quantidade é válida
    if (novaQuantidade > produto.quantidade) {
        return res.status(400).send('Quantidade solicitada excede a quantidade disponível no estoque.');
    }

    console.log(`Atualizando quantidade do produto ${produtoId} para ${novaQuantidade}`);

    // Atualiza a quantidade no banco de dados
    await updateDoc(doc(banco, 'produtos', produtoId), {
        quantidade: produto.quantidade - novaQuantidade // Atualiza a quantidade no estoque
    });

    // Após atualizar, redirecione de volta para a página de produtos ou outra ação
    res.redirect('/produtos');
});

//PATCH: Atualiza parcialmente um recurso existente, só para que nao fique adicionando produtos que nao estão no estoque
app.patch('/atualizar-quantidade/:id', async (req, res) => {
    const id = req.params.id;
    const { quantidade } = req.body;
  
    const idProduto = doc(banco, 'produtos', id);
  
    try {
      const produtoDoc = await getDoc(idProduto);
      if (!produtoDoc.exists()) {
        return res.status(404).send('Produto não encontrado');
      }
  
      await updateDoc(idProduto, { quantidade: quantidade });
      console.log('Quantidade atualizada com sucesso');
      res.status(200).send('Quantidade atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      res.status(500).send('Erro ao atualizar quantidade');
    }
  });
  // Rota para finalizar a compra
app.post('/finalizar-compra', async (req, res) => {
    if (!req.session.carrinho || req.session.carrinho.length === 0) {
        return res.status(400).send('Seu carrinho está vazio.');
    }

    try {
        // Itera sobre os produtos no carrinho
        for (const item of req.session.carrinho) {
            const produtoId = item.id;
            const quantidadeComprada = item.quantidade;

            // Aqui você deve obter o produto do banco de dados
            const produtoDoc = await getDoc(doc(banco, 'produtos', produtoId));

            if (produtoDoc.exists()) {
                const produtoData = produtoDoc.data();
                const quantidadeDisponivel = produtoData.quantidade;

                // Atualiza a quantidade no estoque
                const novaQuantidade = quantidadeDisponivel - quantidadeComprada;

                if (novaQuantidade <= 0) {
                    // Exclui o produto se a quantidade chegar a 0
                    await deleteDoc(doc(banco, 'produtos', produtoId));
                } else {
                    // Atualiza a quantidade do produto
                    await updateDoc(doc(banco, 'produtos', produtoId), { quantidade: novaQuantidade });
                }
            }
        }

        // Limpa o carrinho após finalizar a compra
        req.session.carrinho = [];
        res.redirect('/compra-confirmada'); // Redireciona para uma página de confirmação de compra
    } catch (error) {
        console.error('Erro ao finalizar a compra:', error);
        res.status(500).send('Erro ao finalizar a compra.');
    }
});
app.get('/compra-confirmada', (req, res) => {
    res.render('compra-confirmada'); // Renderiza a página de compra finalizada
});
app.listen(3000, () => {
    console.log("3bits TechStore na porta http://localhost:3000");
});
