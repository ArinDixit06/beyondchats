<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    protected $fillable = [
        'title',
        'original_content',
        'updated_content',
        'original_url',
        'is_updated',
        'citation_links'
    ];

    protected $casts = [
        'is_updated' => 'boolean',
        'citation_links' => 'array'
    ];
}
