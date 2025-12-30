<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ArticleController extends Controller
{
    // GET /api/articles
    public function index()
    {
        return Article::latest()->get();
    }

    // GET /api/articles/{id}
    public function show($id)
    {
        return Article::findOrFail($id);
    }

    // POST /api/articles
    public function store(Request $request)
    {
        return Article::create($request->all());
    }

    // PUT /api/articles/{id}
    public function update(Request $request, $id)
    {
        $article = Article::findOrFail($id);
        $article->update($request->all());
        return $article;
    }

    // DELETE /api/articles/{id}
    public function destroy($id): JsonResponse
    {
        Article::destroy($id);
        return response()->json(['deleted' => true]);
    }
}
