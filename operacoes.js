function limpar(){
    document.formulario.tela.value = '';
}
function deletar(){
    var expressao = document.formulario.tela.value;
    document.formulario.tela.value = expressao.substring(0 , expressao.length-1);
}
function inserir(valor){
    document.formulario.tela.value = document.formulario.tela.value+valor;
}
function total(){
    var result = document.formulario.tela.value;
    if(result){
        document.formulario.tela.value = eval(result);
    }
}